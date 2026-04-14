import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import mongoose from "mongoose";
import path from "path";
import { fileURLToPath } from "url";

import customersRouter from "./src/routes/customers.js";
import licenseRouter from "./src/routes/license.js";
import adminRouter from "./src/routes/admin.js";

dotenv.config();

const app = express();
app.disable("x-powered-by");

app.use(
  cors({
    origin: true,
    credentials: true,
  })
);
app.use(express.json({ limit: "1mb" }));

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.join(__dirname, "..");

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "dhanra-backend" });
});

app.use("/api/customers", customersRouter);
app.use("/api/license", licenseRouter);
app.use("/api/admin", adminRouter);

// Serve the existing vanilla frontend (root folder)
app.use(express.static(ROOT, { index: "index.html", extensions: ["html"] }));

app.get("*", (_req, res) => {
  res.sendFile(path.join(ROOT, "index.html"));
});

async function start() {
  const port = Number(process.env.PORT || 5000);

  mongoose.set("strictQuery", true);
  await mongoose.connect(process.env.MONGODB_URI);

  app.listen(port, () => {
    console.log(`Dhanra backend listening on http://localhost:${port}`);
  });
}

start().catch((err) => {
  // eslint-disable-next-line no-console
  console.error("Failed to start server:", err);
  process.exit(1);
});

