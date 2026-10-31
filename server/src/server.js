import app from "./app.js";
import config from "./config/index.js";
import { resetWaiting } from "./services/changes.service.js";
import { resetRunning } from "./services/sessions.service.js";

await resetRunning();
await resetWaiting();
// Local only: the agents can edit files, so the API is not exposed to the network.
app.listen(config.port, "127.0.0.1", () => {
  console.log(`Agent Studio API on http://127.0.0.1:${config.port}`);
});
