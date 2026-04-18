import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import multer from "multer";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const uploadsDirectory = path.resolve(__dirname, "../../uploads");

if (!process.env.VERCEL) {
  fs.mkdirSync(uploadsDirectory, { recursive: true });
}

const documentUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 15 * 1024 * 1024,
  },
});

const sanitizeFilename = (fileName) =>
  fileName.replace(/[^a-zA-Z0-9.-]/g, "-").toLowerCase();

const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 20 * 1024 * 1024,
  },
});

export { documentUpload, imageUpload, sanitizeFilename };
