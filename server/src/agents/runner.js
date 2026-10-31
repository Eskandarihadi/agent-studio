// Runs one agent turn through the Claude Agent SDK, which uses the Claude Code login on this machine.
import { createSdkMcpServer, query, tool } from "@anthropic-ai/claude-agent-sdk";
import { z } from "zod";
import * as agentsService from "../services/agents.service.js";
import * as changes from "../services/changes.service.js";
import { publish } from "../services/events.service.js";
import * as sessions from "../services/sessions.service.js";
import { buildPlugin } from "./plugin.js";
import { CHANGE_TOOL, codeModePrompt, hiddenTools, isDangerous, systemPrompt, toolPolicy } from "./modes.js";

const MAX_CHECKPOINTS = 5;

// Tools the app itself gives the developer:
//   propose_plan  (plan phase)  hands the plan to the user for approval
//   checkpoint    (build phase) shows the work so far to the observers and returns their comments
//   propose_change (Agent Studio Code) puts a suggested edit in the user's changes panel
function studioServer({ phase, onPlan, onCheckpoint, onSuggest }) {
  const tools = [];
  if (phase === "plan") {
    tools.push(
      tool(
        "propose_plan",
        "Send your plan to the user for approval. Use it once your investigation is done and you know what you will change.",
        { plan: z.string().describe("The plan in Markdown: goal, files or areas to change, approach, risks") },
        async ({ plan }) => {
          onPlan(plan);
          return { content: [{ type: "text", text: "The plan was sent to the user. End your turn now with one short sentence, and do nothing else." }] };
        },
        { alwaysLoad: true },
      ),
    );
  }
  if (phase === "build" && onCheckpoint) {
    let used = 0;
    tools.push(
      tool(
        "checkpoint",
        "Show the observers the work you have done so far and get their comments. Call it after each stage of the plan, before moving on.",
        { summary: z.string().describe("What you did in this stage and what comes next") },
        async ({ summary }) => {
          used += 1;
          if (used > MAX_CHECKPOINTS) return { content: [{ type: "text", text: "No more checkpoints for this task. Finish the work." }] };
          const feedback = await onCheckpoint(summary, used);
          return { content: [{ type: "text", text: feedback }] };
        },
        { alwaysLoad: true },
      ),
    );
  }
  if (onSuggest) {
    tools.push(
      tool(
        "propose_change",
        "Suggest a code change to the user. It appears in the changes panel; the app applies it only if the user accepts.",
        {
          file: z.string().describe("Path of the file, relative to the project folder"),
          old_text: z.string().describe("The exact text to replace, unique in the file. Empty only for a new file"),
          new_text: z.string().describe("The text to put in its place"),
          reason: z.string().describe("Why, in one short sentence"),
        },
        async (args) => {
          try {
            await onSuggest(args);
            return { content: [{ type: "text", text: "The suggestion is in the user's changes panel." }] };
          } catch (err) {
            return { content: [{ type: "text", text: `Not sent: ${err.message}` }], isError: true };
          }
        },
        { alwaysLoad: true },
      ),
    );
  }
  return tools.length ? { studio: createSdkMcpServer({ name: "studio", tools }) } : undefined;
}

// "Read: src/app.js" instead of the full path, so the live log stays short.
function describeTool(name, input = {}, workdir = "") {
  const detail = input.file_path || input.path || input.pattern || input.command || input.url || input.query || input.skill || "";
  const variants = [workdir, workdir.replaceAll("/", "\\"), workdir.replaceAll("\\", "/")].filter(Boolean).map((w) => w.replace(/[\\/]+$/, ""));
  let text = String(detail).replace(/\s+/g, " ");
  for (const w of variants) text = text.split(`${w}\\`).join("").split(`${w}/`).join("").split(w).join(".");
  return text ? `${name}: ${text.length > 140 ? `${text.slice(0, 140)}…` : text}` : name;
}

/**
 * role: "lead" or "member". Each agent keeps one SDK conversation per role in a session,
 * so it remembers earlier rounds.
 * phase: only for developer mode, "plan" or "build".
 * onCheckpoint(summary, n): optional, build phase only; returns the observers' comments as text.
 * Returns { text, plan } where plan is set when the agent proposed a plan.
 */
export async function runAgent({ session, agent, role, mode, phase, prompt, signal, onCheckpoint }) {
  const key = `${agent.id}:${role}`;
  const policy = toolPolicy(agent, mode, phase);
  const assigned = await agentsService.skillsOf(agent.id);
  const { plugins, skills, cleanup } = await buildPlugin(agent, assigned);
  const abortController = new AbortController();
  signal.addEventListener("abort", () => abortController.abort(), { once: true });
  let plan = null;
  const fresh = await sessions.get(session.id);
  const codeMode = fresh.code_mode;
  // acceptEdits would apply edits without asking, so Agent Studio Code uses the default mode.
  const permissionMode = codeMode && policy.permissionMode === "acceptEdits" ? "default" : policy.permissionMode;
  const canSuggest = codeMode && phase !== "plan" && agent.kind === "S" && policy.allow !== "all";

  const post = (kind, content, meta) =>
    sessions.addMessage(session.id, { author: "agent", agentId: agent.id, mode, kind, content, meta });

  async function canUseTool(name, input) {
    if (codeMode && policy.allow === "all" && (name === "Edit" || name === "Write")) {
      const change =
        name === "Edit"
          ? { file: input.file_path, oldText: input.old_string, newText: input.new_string }
          : { file: input.file_path, oldText: "", newText: input.content };
      const { approved, feedback } = await changes.request(session, agent, mode, change, signal);
      if (approved) return { behavior: "allow", updatedInput: input };
      return { behavior: "deny", message: feedback ? `The user rejected this change: ${feedback}` : "The user rejected this change." };
    }
    if (codeMode && name === "NotebookEdit") return { behavior: "deny", message: "NotebookEdit is not available in Agent Studio Code." };
    if (name === CHANGE_TOOL && canSuggest) return { behavior: "allow", updatedInput: input };
    if (policy.allow !== "all" && !policy.allow.has(name)) {
      return { behavior: "deny", message: `${name} is not allowed in ${mode} mode.` };
    }
    if (name === "Bash" && isDangerous(input.command)) {
      return { behavior: "deny", message: "That command is blocked in Agent Studio. Ask the user to run it themselves." };
    }
    return { behavior: "allow", updatedInput: input };
  }

  const q = query({
    prompt,
    options: {
      cwd: session.workdir,
      resume: fresh.sdk_sessions[key],
      model: agent.model || undefined,
      systemPrompt: { type: "preset", preset: "claude_code", append: systemPrompt(agent, mode, assigned, codeMode ? codeModePrompt(mode, phase) : "") },
      settingSources: ["project"],
      permissionMode,
      disallowedTools: hiddenTools(policy.allow),
      canUseTool,
      plugins,
      skills,
      mcpServers: studioServer({
        phase,
        onPlan: (p) => (plan = p),
        onCheckpoint,
        onSuggest: canSuggest
          ? (c) => changes.suggest(session, agent, mode, { file: c.file, oldText: c.old_text, newText: c.new_text, reason: c.reason })
          : undefined,
      }),
      abortController,
    },
  });

  publish(session.id, "agent", { agentId: agent.id, state: "working", mode });
  let text = "";
  try {
    for await (const m of q) {
      if (m.session_id && m.session_id !== fresh.sdk_sessions[key]) {
        fresh.sdk_sessions[key] = m.session_id;
        await sessions.saveSdkSession(session.id, key, m.session_id);
      }
      if (m.type === "assistant") {
        for (const block of m.message.content) {
          if (block.type === "tool_use" && !/propose_(plan|change)$/.test(block.name)) {
            const label = block.name.endsWith("checkpoint") ? "Checkpoint: asked the observers" : describeTool(block.name, block.input, session.workdir);
            await post("activity", label, { tool: block.name });
          }
        }
      } else if (m.type === "result") {
        if (m.subtype !== "success") throw new Error(`${agent.name} stopped: ${m.subtype.replaceAll("_", " ")}`);
        text = m.result || "";
      }
    }
  } finally {
    publish(session.id, "agent", { agentId: agent.id, state: "idle", mode });
    await cleanup();
  }
  return { text, plan };
}
