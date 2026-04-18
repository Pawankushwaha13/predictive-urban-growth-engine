import dotenv from "dotenv";

import { connectDatabase, databaseState } from "../config/db.js";
import seedRecords from "../data/seedRecords.js";
import { upsertIntelligenceRecords } from "../repositories/intelligenceRepository.js";

dotenv.config();

const run = async () => {
  await connectDatabase();

  if (!databaseState.connected) {
    throw new Error("MongoDB is required to run the seed script.");
  }

  await upsertIntelligenceRecords(seedRecords);
  console.log(`Seeded ${seedRecords.length} intelligence records.`);
  process.exit(0);
};

run().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
