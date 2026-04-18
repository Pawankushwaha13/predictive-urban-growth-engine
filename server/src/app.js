import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import morgan from "morgan";

import connectorRoutes from "./routes/connectorRoutes.js";
import ingestionRoutes from "./routes/ingestionRoutes.js";
import intelligenceRoutes from "./routes/intelligenceRoutes.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";
import { uploadsDirectory } from "./middleware/upload.js";

dotenv.config();

const app = express();

app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,
  }),
);
app.use(morgan("dev"));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use("/uploads", express.static(uploadsDirectory));

app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    service: "strategic-fusion-dashboard-api",
  });
});

app.use("/api/intelligence", intelligenceRoutes);
app.use("/api/ingestion", ingestionRoutes);
app.use("/api/connectors", connectorRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
