// Example agents so the app is not empty on first run. Edit or delete them in the app.
export const agents = [
  {
    slug: "s-backend", name: "Backend", kind: "S", tools: "write",
    description: "Node.js, Express, REST API design, PostgreSQL queries and migrations",
    instructions: "Care about clear layering (routes, controllers, services, db), input validation, error handling and safe SQL.",
  },
  {
    slug: "s-frontend", name: "Frontend", kind: "S", tools: "write",
    description: "React, Vite, Bootstrap, component structure and state",
    instructions: "Care about small reusable components, accessible markup and responsive layout.",
  },
  {
    slug: "s-security", name: "Security", kind: "S", tools: "read",
    description: "Application security: auth, injection, secrets, file uploads, permissions",
    instructions: "Look for concrete, exploitable problems first. Rank findings by real risk.",
  },
  {
    slug: "s-ux", name: "UX", kind: "S", tools: "read",
    description: "User experience, flows, wording and visual hierarchy",
    instructions: "Think from the point of view of a first-time user of the product.",
  },
  {
    slug: "t-translator", name: "Translator", kind: "T", tools: "none",
    description: "Translates text between Persian and English",
    instructions: "Translate the input. If it is Persian, translate it to English; otherwise to Persian. Return only the translation.",
  },
  {
    slug: "t-summarizer", name: "Summarizer", kind: "T", tools: "read",
    description: "Summarizes text or files into short bullet points",
    instructions: "Summarize the input in at most 7 short bullet points.",
  },
];
