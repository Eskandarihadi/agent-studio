// What each mode tells the agent, and which tools it may use there.

export const PLAN_TOOL = "mcp__studio__propose_plan";
export const CHANGE_TOOL = "mcp__studio__propose_change";
const READ_TOOLS = ["Read", "Glob", "Grep", "WebSearch", "WebFetch", "Skill", "TodoWrite", "ToolSearch"];
const KNOWN_TOOLS = [...READ_TOOLS, "Bash", "Edit", "Write", "NotebookEdit", "Agent", "Task"];

export const MODES = {
  developer: {
    label: "Developer",
    prompt: `You are in DEVELOPER mode.
Each request goes in two phases:
1. PLAN: investigate the code read-only, then send a plan with the propose_plan tool. The plan is for the
   user's approval at a high level, not line by line: the goal, the files or areas you will change, the approach,
   and the risks. If the message is only a question that needs no code changes, just answer it.
2. BUILD: once the user approves, implement the whole plan without asking about individual edits. If you find you
   must depart substantially from the approved plan, stop and explain what changed and why in your final message.
End the build with a short summary: what changed (files), how to check it, and anything left undone.`,
  },
  tester: {
    label: "Tester",
    prompt: `You are in TESTER mode.
Test the feature or area the user names, from the point of view of your expertise. Run existing tests and commands,
and use Bash for quick checks, but do not modify project files.
Report: what you tested and how, the results (pass or fail, with evidence), each bug with steps to reproduce,
and its severity (high, medium, low).`,
  },
  observer: {
    label: "Observer",
    prompt: `You are in OBSERVER mode.
You review work done by someone else: the user, or another agent. Only comment; never modify files.
Stick to your own expertise. Be concise: list concrete concerns (with file and line where you can), their severity
(high, medium, low) and a suggestion for each. If nothing in your field needs attention, say so in one line.`,
  },
  consultant: {
    label: "Consultant",
    prompt: `You are in CONSULTANT mode, advising the user.
Give your view on the topic from your expertise: a clear recommendation, the reasoning, trade-offs and risks.
Be direct, and disagree with the obvious answer when you have a reason to. Keep it focused (under about 300 words
unless the topic needs more). Do not modify files.`,
  },
  assistant: {
    label: "Assistant",
    prompt: `You are an ASSISTANT agent. Do exactly the requested task on the given input and return the output,
with no extra commentary unless asked.`,
  },
};

const CODE_MODE_EDITS = `The user is reviewing changes in Agent Studio Code. Make every file change with Edit or Write, never through Bash, because each one is shown to the user for approval. If a change is rejected, read the reason, adapt, and do not repeat the same change.`;

const CODE_MODE_SUGGESTIONS = `The user is reviewing changes in Agent Studio Code. When you have a concrete code fix, call propose_change. It appears in the user's changes panel under your name, and the app applies it if the user accepts. Copy old_text exactly from the file, and make it unique there. Use an empty old_text only for a new file. Do not suggest changes outside your expertise.`;

// In Agent Studio Code, edits wait for the user. Other agents can only suggest.
export function codeModePrompt(mode, phase) {
  if (phase === "plan") return "";
  return mode === "developer" || mode === "assistant" ? CODE_MODE_EDITS : CODE_MODE_SUGGESTIONS;
}

export function systemPrompt(agent, mode, skills = [], extra = "") {
  const role = agent.kind === "S" ? "specialist" : "assistant";
  const skillList = skills.map((s) => `- ${s.slug}: ${s.description}`).join("\n");
  return [
    `You are "${agent.name}", a ${role} agent in Agent Studio.`,
    agent.description && `Your expertise: ${agent.description}`,
    agent.instructions,
    skills.length && `You were given these skills. Load one with the Skill tool whenever its description fits the task, and follow it:\n${skillList}`,
    MODES[mode].prompt,
    extra,
    "Unless your instructions above say otherwise, reply in the same language the user writes in.",
  ]
    .filter(Boolean)
    .join("\n\n");
}

// Returns the SDK permission mode and the set of tools allowed ("all" means everything).
export function toolPolicy(agent, mode, phase) {
  if (mode === "developer") {
    return phase === "plan" ? { permissionMode: "default", allow: new Set([...READ_TOOLS, PLAN_TOOL]) } : { permissionMode: "acceptEdits", allow: "all" };
  }
  if (mode === "tester") return { permissionMode: "default", allow: new Set([...READ_TOOLS, "Bash"]) };
  if (mode === "assistant") {
    if (agent.tools === "write") return { permissionMode: "acceptEdits", allow: "all" };
    if (agent.tools === "read") return { permissionMode: "default", allow: new Set(READ_TOOLS) };
    return { permissionMode: "default", allow: new Set(["Skill"]) };
  }
  return { permissionMode: "default", allow: new Set(READ_TOOLS) };
}

export function hiddenTools(allow) {
  // Plans go through propose_plan, so Claude Code's own plan mode tools are hidden.
  const always = ["AskUserQuestion", "EnterPlanMode", "ExitPlanMode"];
  if (allow === "all") return always;
  return [...always, ...KNOWN_TOOLS.filter((t) => !allow.has(t))];
}

const DANGEROUS = [
  /\brm\s+-\w*[rf]\w*[rf]/i,
  /\bgit\s+push\b/i,
  /\bgit\s+reset\s+--hard\b/i,
  /\bgit\s+clean\s+-\w*f/i,
  /Remove-Item\b.*-Recurse/i,
  /\brmdir\s+\/s\b/i,
  /\bdel\s+\/[sq]\b/i,
  /\bformat\s+[a-z]:/i,
  /\b(shutdown|mkfs|diskpart)\b/i,
];

export function isDangerous(command = "") {
  return DANGEROUS.some((re) => re.test(command));
}
