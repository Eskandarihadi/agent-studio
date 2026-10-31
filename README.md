# Agent Studio

[فارسی](README.fa.md)

A local, graphical app for running your own team of AI agents on your code. Turn agents on and off, choose a mode for each one, and give them a task or a topic. A developer agent plans and builds, observer agents comment on its work while it is in progress, testers test the result, and consultants discuss a question with each other.

It runs on your computer and uses [Claude](https://claude.com) through the [Claude Agent SDK](https://docs.claude.com/en/docs/agent-sdk/overview). The interface is in English and Persian.

## Contents

- [How it works](#how-it-works)
- [Requirements](#requirements)
- [Setup](#setup)
- [Connecting to Claude](#connecting-to-claude)
- [Using the app](#using-the-app)
- [Skills](#skills)
- [Moving to another computer](#moving-to-another-computer)
- [Project layout](#project-layout)
- [Safety](#safety)
- [Troubleshooting](#troubleshooting)
- [License](#license)

## How it works

There are two kinds of agent:

- **Assistant (T)** takes an input, does the one task it is made for, and returns the output. For example: a translator or a summarizer.
- **Specialist (S)** has an area of expertise, such as backend, security or UX, and works in the mode you pick for it:

| Mode | What the agent does |
|---|---|
| **Developer** | Investigates, then proposes a plan. You approve it as a whole, not line by line, or ask for changes. Then it builds. |
| **Tester** | Tests the feature you name from its area of expertise and reports what passed, what failed, and how to reproduce it. |
| **Observer** | Reviews work done by you or by another agent. It only comments and never changes files. |
| **Consultant** | Gives its view on a question or a topic. |

Each agent can be turned on or off and has its own [skills](#skills).

### The control room

The control room is the main page. Every agent is a card with an on/off switch, its mode, whether it is working right now, and its last few steps. You pick a project folder, set the modes, and write a message. Before you send, a line above the box tells you who will act.

What happens depends on the agents that are on, checked in this order:

| You have | What happens |
|---|---|
| A message that starts with `@Name` | Only that agent acts. An assistant does its task; a specialist answers as a consultant and the observers comment on its answer. |
| A developer | The developer plans → observers review the plan → you approve or ask for changes → the developer builds **in stages**: after each stage the observers comment and the developer takes their comments into account before going on → observers give a final review → testers test the result. |
| Testers | Each tests what you named; observers review the reports. |
| One consultant | It answers; observers comment on the answer. |
| Two or more consultants | A discussion in two rounds: each answers, then each reads the others and responds. |
| Only observers | They review your own uncommitted changes in the folder (from `git diff`). |

Only one agent can be the developer at a time. Choosing a new one makes the previous one a consultant. Every conversation is kept on the **History** page, where you can also continue it.

### Agent Studio Code

The switch at the top of the page changes the control room to **Agent Studio Code**, which adds a changes panel. Each code change appears there with its file, its path and the agent behind it, and asks whether to make it:

- A developer's edit waits for your answer before it reaches the file. If you say no, you can give a reason, and the agent reads it and adapts.
- Testers, observers and consultants cannot edit, but they can suggest a change. If you accept, the app applies it.

Commands that an agent runs in the terminal are not shown in the panel. Agents are told to change files only through their edit tools, but a command could still change a file, so keep your work under git.

### Shared conclusion

Tick **Choose** on two or more results in a conversation, or press **Choose all results**, then press **Discuss and agree**. The agents that wrote those results respond to each other, and one of them writes a shared conclusion. If they still disagree, it says so and recommends an option.

## Requirements

- [Node.js](https://nodejs.org) 20 or newer
- [PostgreSQL](https://www.postgresql.org/download/) 14 or newer, running locally
- Access to Claude: either [Claude Code](https://docs.claude.com/en/docs/claude-code/overview) signed in on this computer, or an Anthropic API key (see [Connecting to Claude](#connecting-to-claude))
- Git, so observers can see what changed in a project

## Setup

### Windows

1. Download the project:

   ```bash
   git clone https://github.com/Eskandarihadi/agent-studio.git
   ```

2. In the `agent-studio` folder, double-click **`set-password.cmd`** and type your PostgreSQL password. It writes `.env` for you and creates the database.
3. Double-click **`start.cmd`**. It installs the packages the first time, prepares the database, starts the app, and opens http://localhost:5180.

To make a desktop shortcut, right-click `start.cmd` → *Send to* → *Desktop (create shortcut)*. Close the black window to stop the app.

### macOS and Linux

```bash
git clone https://github.com/Eskandarihadi/agent-studio.git
```

```bash
cd agent-studio
```

```bash
cp .env.example .env
```

Open `.env` and put your PostgreSQL user and password in `DATABASE_URL`. Then:

```bash
npm install
```

```bash
npm run db:setup
```

```bash
npm run dev
```

Open http://localhost:5180.

`npm run db:setup` creates the `agent_studio` database if it is missing, applies the migrations, and adds a few example agents. It is safe to run again.

## Connecting to Claude

The agents run through the Claude Agent SDK, which uses Claude Code under the hood. It needs one of these:

**A. Your Claude Code login (personal use).** Install Claude Code and sign in once:

```bash
npm install -g @anthropic-ai/claude-code
```

```bash
claude
```

After that, Agent Studio uses that login, and the agents' usage counts against your own Claude plan. A login is personal, so don't share it with other people.

**B. An API key.** Create a key in the [Claude Console](https://console.anthropic.com) and add it to `.env`:

```
ANTHROPIC_API_KEY=your-key
```

When the key is set it takes precedence over the login, and usage is billed to that Console account. Use this when the app is used by someone other than the owner of the login.

Each agent can use a different model (Opus, Sonnet or Haiku). Haiku is the fastest and cheapest, which suits simple assistants and quick reviews.

## Using the app

1. **Agents page.** Create your agents. For each one, write its expertise and instructions, and choose:
   - its type: S or T
   - its tools: *none*, *read only*, or *read and write*. The developer mode needs *read and write*.
   - its model
   - its skills
2. **Control room.** Choose the project folder, turn on the agents you want, and pick each one's mode.
3. Write a task or a topic and press **Send** (or Ctrl+Enter).
4. If a developer proposes a plan, read the observers' reviews. Then press **Approve and build**, or write what should change.
5. Press **Stop** at any time to stop the agents.

Tips:

- Put a `CLAUDE.md` file at the root of your project describing the project, its stack and its rules. Every agent reads it at the start of each conversation.
- Use the **@** button on a card to put that agent's name in the message, so only that agent answers.
- Agents answer in the language you write in.

## Skills

A skill is a folder with a `SKILL.md` file that teaches an agent how to do something specific. Skills live in one library and you choose which agents get which ones. Each agent only sees its own skills.

On the **Skills** page you can:

- **Install from GitHub.** Paste a link to a folder that has a `SKILL.md` at its root, for example `https://github.com/anthropics/skills/tree/main/skills/pdf`. You see the `SKILL.md` and the list of files before anything is installed.
- **Write your own** `SKILL.md`.

Then open an agent on the **Agents** page and tick its skills.

> Skills can include scripts that agents may run on your computer. Read a skill before installing it, and only install skills from sources you trust.

Browse skills at [anthropics/skills](https://github.com/anthropics/skills).

## Moving to another computer

The code is in this repository. Your own data is not:

- agents and conversations are in the PostgreSQL database
- installed skills are in the `data/` folder

To move them, copy the `data/` folder and the database:

```bash
pg_dump -U postgres -d agent_studio -f agent_studio.sql
```

On the new computer, after `npm run db:setup`:

```bash
psql -U postgres -d agent_studio -f agent_studio.sql
```

## Project layout

```
server/src/
  routes/        URLs and input validation (zod)
  controllers/   turn requests into service calls
  services/      agents, skills, sessions, git diffs, live events,
                 orchestrator (decides which agents act, in which mode)
  agents/        modes.js   what each mode tells the agent, and which tools it may use
                 runner.js  runs one agent through the Claude Agent SDK, with the app's own
                            tools: propose_plan (plan for approval) and checkpoint (mid-work review)
                 plugin.js  gives each agent only its own skills
  db/            connection, SQL migrations, setup script
client/src/
  pages/         ControlRoom, Agents, Skills, History, SessionPage
  components/    Conversation (the live chat), shared UI
  lib/           API calls, live updates (Server-Sent Events), English/Persian text
data/            installed skills (not in git)
```

Stack: Node.js, Express 5, PostgreSQL (`pg`), React 19, Vite, Bootstrap 5 (with its right-to-left build for Persian), and the Claude Agent SDK.

## Safety

Agents in developer mode can edit files and run commands in the project folder you choose. Because of this:

- The API listens only on `127.0.0.1`, so other computers on your network cannot reach it. Don't expose it to the internet: it has no login.
- Commands such as `git push`, `git reset --hard`, `rm -rf` and `Remove-Item -Recurse` are blocked for agents.
- Testers, observers and consultants cannot edit files.
- Work in a folder under git, so you can review and undo what an agent changed.
- `.env` holds your database password and is never committed. Never commit it.

## Troubleshooting

| Problem | What to do |
|---|---|
| `password authentication failed for user "postgres"` | The password in `.env` is wrong or wasn't saved. Run `set-password.cmd` again, or edit `DATABASE_URL`. |
| `DATABASE_URL is missing` | Copy `.env.example` to `.env` and fill it in. |
| Agents fail with an authentication error | Sign in with `claude` once, or set `ANTHROPIC_API_KEY` in `.env`. |
| `GitHub rate limit reached` when installing a skill | Wait an hour, or set `GITHUB_TOKEN` in `.env`. |
| Port 4100 or 5180 is already in use | Another copy is running. Close it, or change `PORT` in `.env` and the proxy in `client/vite.config.js`. |

## License

[MIT](LICENSE)
