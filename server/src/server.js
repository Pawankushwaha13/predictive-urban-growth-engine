import dotenv from "dotenv";

import app from "./app.js";
import { connectDatabase, databaseState } from "./config/db.js";

dotenv.config();

const port = Number(process.env.PORT) || 5000;

const startServer = async () => {
  await connectDatabase();

  app.listen(port, () => {
    const mode = databaseState.connected ? "MongoDB" : "demo fallback";
    console.log(`Fusion dashboard API listening on port ${port} (${mode})`);
  });
};

startServer();

