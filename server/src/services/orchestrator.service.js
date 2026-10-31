// Decides which agents run, in which mode.
//
// Control room ("room" sessions): who acts comes from each agent's own mode, read when you send:
//   @Assistant text      that assistant (T) turns the input into output
//   @Specialist text     only that specialist answers as a consultant; the observers comment on its answer
//   a developer is on    it plans → observers review the plan → you approve → it builds in stages,
//                        calling checkpoint after each stage so observers comment mid-work → final review → testers test it
//   else testers are on  each tests the feature → observers review the reports
//   else consultants     one: it answers and observers comment; two or more: a discussion in rounds
//   else only observers  they review your own uncommitted work
//
// Older sessions fix their roles when created: develop, test, observe, consult, assist.
import { runAgent } from "../agents/runner.js";
import AppError from "../utils/AppError.js";
import * as agentsService from "./agents.service.js";
import { changes } from "./git.service.js";
import * as sessions from "./sessions.service.js";
import * as uploads from "./uploads.service.js";

const DISCUSSION_ROUNDS = 2;
const running = new Map();

export function stop(sessionId) {
  running.get(sessionId)?.abort();
}

// Runs the work in the background so the request can return at once.
// onFail is the state to go back to if the work fails or is stopped.
function start(session, work, pending = null, onFail = { status: "idle", pending: null }) {
  const controller = new AbortController();
  running.set(session.id, controller);
  sessions.setStatus(session.id, "running", pending).then(async () => {
    let next = { status: "idle", pending: null };
    try {
      next = (await work(controller.signal)) || next;
    } catch (err) {
      next = onFail;
      const stopped = controller.signal.aborted;
      await sessions.addMessage(session.id, {
        author: "system",
        kind: stopped ? "text" : "error",
        content: stopped ? "Stopped." : err.message,
      });
    } finally {
      running.delete(session.id);
      await sessions.setStatus(session.id, next.status, next.pending);
    }
  });
}

// Agents that are on, grouped by their mode.
async function roster() {
  const on = (await agentsService.list()).filter((a) => a.enabled);
  const by = (mode) => on.filter((a) => a.kind === "S" && a.mode === mode);
  return {
    all: on,
    developers: by("developer"),
    testers: by("tester"),
    observers: by("observer"),
    consultants: by("consultant"),
  };
}

async function load(sessionId) {
  const session = await sessions.get(sessionId);
  if (session.type === "room") {
    const r = await roster();
    const lead = session.pending?.leadId ? await agentsService.get(session.pending.leadId) : null;
    return { session, lead, members: r.observers, roster: r };
  }
  const lead = session.lead_agent_id ? await agentsService.get(session.lead_agent_id) : null;
  const members = (await agentsService.getMany(session.member_ids)).filter((a) => a.enabled);
  return { session, lead, members };
}

function ensureIdle(session) {
  if (session.status === "running") throw new AppError("The agents are still working. Wait or press Stop.", 409);
}

const say = (session, agent, mode, content, kind = "text", meta = {}) =>
  sessions.addMessage(session.id, { author: "agent", agentId: agent.id, mode, kind, content, meta });
const note = (session, content, kind = "text") => sessions.addMessage(session.id, { author: "system", kind, content });

// Every observer reviews the same material in parallel; each posts its own review.
// Returns the reviews so a developer can read them at a checkpoint.
async function review(session, observers, prompt, signal, meta = {}) {
  const results = await Promise.all(
    observers.map(async (agent) => {
      try {
        const { text } = await runAgent({ session, agent, role: "member", mode: "observer", prompt, signal });
        await say(session, agent, "observer", text, "review", meta);
        return { agent, text };
      } catch (err) {
        if (signal.aborted) throw err;
        await note(session, `${agent.name}: ${err.message}`, "error");
        return null;
      }
    }),
  );
  return results.filter(Boolean);
}

async function plan(session, lead, members, request, prompt, signal) {
  const result = await runAgent({ session, agent: lead, role: "lead", mode: "developer", phase: "plan", prompt, signal });
  if (!result.plan) {
    await say(session, lead, "developer", result.text);
    return;
  }
  await say(session, lead, "developer", result.plan, "plan");
  if (members.length) {
    await review(
      session,
      members,
      `The developer agent "${lead.name}" proposed this plan.\n\nUser request:\n${request}\n\nPlan:\n${result.plan}\n\nReview the plan from your expertise. The user will read your review before approving it.`,
      signal,
    );
  }
  return { status: "awaiting_approval", pending: { request, plan: result.plan, leadId: lead.id } };
}

async function build(session, lead, observers, testers, note_, signal) {
  const { plan: approved } = session.pending;
  let prompt = `The user approved your plan.${note_ ? ` Note from the user: ${note_}` : ""} Implement it now.`;
  let onCheckpoint;
  if (observers.length) {
    prompt += `\n\nObservers are watching your work: ${observers.map((o) => o.name).join(", ")}. Work in stages. After each stage, call the checkpoint tool with a short summary; it returns their comments. Fix high and medium concerns before you move on.`;
    onCheckpoint = async (summary, n) => {
      const diff = await changes(session.workdir);
      const reviews = await review(
        session,
        observers,
        `Checkpoint ${n}: the developer agent "${lead.name}" is in the middle of implementing this plan:\n${approved}\n\nWhat it says it did in this stage:\n${summary}\n\n${diff}\n\nComment on this stage from your expertise, briefly. The developer reads your comment before continuing.`,
        signal,
        { checkpoint: n },
      );
      if (!reviews.length) return "No comments from the observers. Continue.";
      return reviews.map((r) => `${r.agent.name} (observer):\n${r.text}`).join("\n\n");
    };
  }
  const { text } = await runAgent({ session, agent: lead, role: "lead", mode: "developer", phase: "build", prompt, signal, onCheckpoint });
  await say(session, lead, "developer", text, "result");

  if (observers.length) {
    const diff = await changes(session.workdir);
    await review(
      session,
      observers,
      `The developer agent "${lead.name}" finished the approved plan.\n\nPlan:\n${approved}\n\nIts summary:\n${text}\n\n${diff}\n\nGive your final review of this work from your expertise. You may Read files for more context.`,
      signal,
      { final: true },
    );
  }
  if (testers.length) {
    await test(session, testers, [], `The developer agent "${lead.name}" just implemented this:\n${approved}\n\nIts summary:\n${text}\n\nTest the result from your expertise.`, signal);
  }
}

async function test(session, testers, observers, prompt, signal) {
  const reports = await Promise.all(
    testers.map(async (agent) => {
      const { text } = await runAgent({ session, agent, role: testers.length > 1 ? "member" : "lead", mode: "tester", prompt, signal });
      await say(session, agent, "tester", text, "result");
      return `${agent.name} (tester):\n${text}`;
    }),
  );
  if (observers.length) {
    await review(session, observers, `The user asked for this to be tested:\n${prompt}\n\nTest reports:\n${reports.join("\n\n")}\n\nReview the testing from your expertise: what it missed, and whether the findings hold.`, signal);
  }
}

async function consultOne(session, agent, observers, question, signal) {
  const { text } = await runAgent({ session, agent, role: "lead", mode: "consultant", prompt: question, signal });
  await say(session, agent, "consultant", text);
  if (observers.length) {
    await review(session, observers, `The user asked the consultant "${agent.name}":\n${question}\n\nIts answer:\n${text}\n\nAs an observer, say where you agree, disagree, or what is missing, from your expertise.`, signal);
  }
}

// Round 1: everyone answers on their own. Later rounds: each reads the others and responds.
async function discuss(session, consultants, question, signal) {
  let answers = [];
  for (let round = 1; round <= DISCUSSION_ROUNDS; round++) {
    const previous = answers;
    answers = await Promise.all(
      consultants.map(async (agent) => {
        const prompt =
          round === 1
            ? question
            : `Round ${round} of the discussion about:\n${question}\n\nWhat the others said:\n${previous
                .filter((a) => a.agent.id !== agent.id)
                .map((a) => `${a.agent.name}:\n${a.text}`)
                .join("\n\n")}\n\nRespond to them: where you agree, where you disagree and why, what they missed. End with your final recommendation. Be brief.`;
        const { text } = await runAgent({ session, agent, role: "member", mode: "consultant", prompt, signal });
        await say(session, agent, "consultant", text, "text", { round });
        return { agent, text };
      }),
    );
  }
}

// "@Name rest of the message" → { agent, rest }. Longer names are tried first so "@Test Dev" beats "@Test".
// An assistant gets the text as the input to work on, not as a chat message to answer.
const asInput = (text) => `Do your task on this input and return only the output.

Input:
${text}`;

function mentioned(text, agents) {
  const lower = text.toLowerCase();
  const tags = agents.flatMap((agent) => [agent.name, agent.slug].map((n) => ({ agent, tag: `@${n.toLowerCase()}` })));
  tags.sort((a, b) => b.tag.length - a.tag.length);
  const hit = tags.find(({ tag }) => lower.startsWith(tag) && /\s/.test(lower[tag.length] || ""));
  return hit ? { agent: hit.agent, rest: text.slice(hit.tag.length).trim() } : null;
}

function roomFlow(session, r, text) {
  const target = mentioned(text, r.all);
  if (target?.agent.kind === "T") {
    return async (signal) => {
      const { text: out } = await runAgent({ session, agent: target.agent, role: "lead", mode: "assistant", prompt: asInput(target.rest), signal });
      await say(session, target.agent, "assistant", out);
    };
  }
  if (target) return (signal) => consultOne(session, target.agent, r.observers.filter((o) => o.id !== target.agent.id), target.rest, signal);
  if (r.developers.length) return (signal) => plan(session, r.developers[0], r.observers, text, text, signal);
  if (r.testers.length) return (signal) => test(session, r.testers, r.observers, text, signal);
  if (r.consultants.length === 1) return (signal) => consultOne(session, r.consultants[0], r.observers, text, signal);
  if (r.consultants.length > 1) return (signal) => discuss(session, r.consultants, text, signal);
  if (r.observers.length) {
    return async (signal) => {
      const diff = await changes(session.workdir);
      await review(session, r.observers, `The user is working on this and wants your review:\n${text}\n\n${diff}\n\nYou may Read files for more context.`, signal);
    };
  }
  return null;
}

// files: attachments already saved by uploads.service. The user sees their names on the message;
// the agents get their paths in the prompt.
const userMeta = (files) => (files.length ? { files: files.map((f) => ({ name: f.name })) } : {});

export async function userMessage(sessionId, typed, files = [], codeMode = false) {
  await sessions.setCodeMode(sessionId, codeMode);
  const { session, lead, members, roster: r } = await load(sessionId);
  ensureIdle(session);
  if (session.status === "awaiting_approval") return revise(sessionId, typed, files);
  const text = typed + uploads.describe(files);

  if (session.type === "room") {
    const flow = roomFlow(session, r, text);
    if (!flow) throw new AppError("Turn on at least one specialist and pick its mode, or write @ and an assistant's name.");
    await sessions.addMessage(session.id, { author: "user", content: typed, meta: userMeta(files) });
    await sessions.retitle(session.id, typed);
    return start(session, flow);
  }

  await sessions.addMessage(session.id, { author: "user", content: typed, meta: userMeta(files) });
  const flows = {
    develop: (signal) => plan(session, lead, members, text, text, signal),
    assist: async (signal) => {
      const { text: out } = await runAgent({ session, agent: lead, role: "lead", mode: "assistant", prompt: asInput(text), signal });
      await say(session, lead, "assistant", out);
    },
    test: (signal) => test(session, [lead], members, text, signal),
    observe: async (signal) => {
      const diff = await changes(session.workdir);
      await review(session, members, `The user is working on this and wants your review:\n${text}\n\n${diff}\n\nYou may Read files for more context.`, signal);
    },
    consult: (signal) => (session.style === "panel" ? discuss(session, members, text, signal) : consultOne(session, lead, members, text, signal)),
  };
  start(session, flows[session.type]);
}

export async function approve(sessionId, note_, codeMode = false) {
  await sessions.setCodeMode(sessionId, codeMode);
  const { session, lead, members, roster: r } = await load(sessionId);
  if (session.status !== "awaiting_approval") throw new AppError("There is no plan waiting for approval", 409);
  if (!lead) throw new AppError("The developer of this plan no longer exists", 409);
  await sessions.addMessage(session.id, { author: "user", kind: "approval", content: note_ ? `Approved. ${note_}` : "Approved." });
  const observers = members.filter((m) => m.id !== lead.id);
  const testers = r ? r.testers : [];
  start(session, (signal) => build(session, lead, observers, testers, note_, signal), session.pending);
}

export async function revise(sessionId, typed, files = []) {
  const { session, lead, members } = await load(sessionId);
  if (session.status !== "awaiting_approval") throw new AppError("There is no plan waiting for approval", 409);
  await sessions.addMessage(session.id, { author: "user", content: typed, meta: userMeta(files) });
  const feedback = typed + uploads.describe(files);
  const prompt = `The user wants changes to your plan before approving it:\n${feedback}\n\nRevise the plan and send it again with propose_plan.`;
  const keep = { status: "awaiting_approval", pending: session.pending };
  // Observers judge the revised plan against everything the user asked, including this change.
  const request = `${session.pending.request}\n\nLater the user asked for this change to the plan:\n${feedback}`;
  start(session, (signal) => plan(session, lead, members.filter((m) => m.id !== lead.id), request, prompt, signal), session.pending, keep);
}

// The chosen results go back to the agents that wrote them: each responds to the others, then the
// first one writes what they agree on, and says plainly where they still differ.
export async function converge(sessionId, messageIds) {
  const { session } = await load(sessionId);
  ensureIdle(session);
  const chosen = (await sessions.messages(sessionId)).filter((m) => messageIds.includes(Number(m.id)) && m.author === "agent" && m.agent_id);
  if (chosen.length < 2) throw new AppError("Choose at least two results");
  const authors = await agentsService.getMany([...new Set(chosen.map((m) => m.agent_id))]);
  const agents = authors.filter((a) => a.enabled && a.kind === "S");
  if (!agents.length) throw new AppError("Turn on at least one specialist that wrote these results");

  const material = chosen
    .map((m) => `${authors.find((a) => a.id === m.agent_id)?.name || "Agent"} (${m.mode || "agent"}):\n${m.content}`)
    .join("\n\n---\n\n");
  await sessions.addMessage(session.id, { author: "user", kind: "converge", content: "Discuss the chosen results.", meta: { count: chosen.length } });

  const keep = session.status === "awaiting_approval" ? { status: session.status, pending: session.pending } : undefined;
  start(
    session,
    async (signal) => {
      const replies = await Promise.all(
        agents.map(async (agent) => {
          const prompt = `The user chose these results and wants one shared conclusion:\n\n${material}\n\nDiscuss them with the other agents: what you keep, what you would change and why. Be brief.`;
          const { text } = await runAgent({ session, agent, role: "member", mode: "consultant", prompt, signal });
          await say(session, agent, "consultant", text, "text", { round: 1 });
          return `${agent.name}:\n${text}`;
        }),
      );
      const [writer] = agents;
      const prompt = `Results:\n\n${material}\n\nDiscussion:\n\n${replies.join("\n\n")}\n\nWrite the shared conclusion: one clear recommendation and the concrete next steps. Do not invent agreement: if a real disagreement remains, name it and say which option you recommend and why.`;
      const { text } = await runAgent({ session, agent: writer, role: "member", mode: "consultant", prompt, signal });
      await say(session, writer, "consultant", text, "joint");
      return keep;
    },
    session.pending,
    keep,
  );
}
