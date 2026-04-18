import { Router } from "express";

import {
  getIntelligenceRecords,
  getIntelligenceSummary,
  seedIntelligenceRecords,
} from "../controllers/intelligenceController.js";

const router = Router();

router.get("/", getIntelligenceRecords);
router.get("/summary", getIntelligenceSummary);
router.post("/seed", seedIntelligenceRecords);

export default router;

