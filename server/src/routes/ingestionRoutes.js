import { Router } from "express";

import {
  ingestImageFiles,
  ingestStructuredFile,
} from "../controllers/ingestionController.js";
import { documentUpload, imageUpload } from "../middleware/upload.js";

const router = Router();

router.post("/manual", documentUpload.single("file"), ingestStructuredFile);
router.post("/images", imageUpload.array("images", 20), ingestImageFiles);

export default router;

