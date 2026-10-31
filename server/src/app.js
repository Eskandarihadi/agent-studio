import express from "express";
import { errorHandler, notFound } from "./middlewares/errorHandler.js";
import routes from "./routes/index.js";

const app = express();
app.use(express.json({ limit: "2mb" }));
app.use("/api", routes);
app.use(notFound);
app.use(errorHandler);

export default app;
