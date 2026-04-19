import { Router } from "express";

import {
  getConnectorTemplates,
  harvestMarketSource,
  harvestMunicipalSource,
  runCombinedPipeline,
  syncMongoSource,
  syncS3Source,
} from "../controllers/connectorController.js";
import { documentUpload } from "../middleware/upload.js";

const router = Router();

router.get("/templates", getConnectorTemplates);
router.post("/municipal/harvest", documentUpload.single("file"), harvestMunicipalSource);
router.post("/market/harvest", harvestMarketSource);
router.post("/pipeline/run", runCombinedPipeline);
router.post("/mongodb/sync", syncMongoSource);
router.post("/s3/sync", syncS3Source);

export default router;
