import { Router } from "express";

import { syncMongoSource, syncS3Source } from "../controllers/connectorController.js";

const router = Router();

router.post("/mongodb/sync", syncMongoSource);
router.post("/s3/sync", syncS3Source);

export default router;

