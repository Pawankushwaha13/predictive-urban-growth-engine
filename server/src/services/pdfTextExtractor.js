import fs from "fs/promises";
import os from "os";
import path from "path";
import { fileURLToPath } from "url";
import { promisify } from "util";
import { execFile } from "child_process";

const execFileAsync = promisify(execFile);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const defaultPythonPath = path.join(
  os.homedir(),
  ".cache",
  "codex-runtimes",
  "codex-primary-runtime",
  "dependencies",
  "python",
  "python.exe",
);

const extractorScriptPath = path.resolve(__dirname, "../scripts/extract_pdf_text.py");

export const extractPdfText = async (buffer, fileName = "document.pdf") => {
  const tempFilePath = path.join(
    os.tmpdir(),
    `urban-growth-${Date.now()}-${path.basename(fileName)}`,
  );
  const pythonPath = process.env.CODEX_BUNDLED_PYTHON || defaultPythonPath;

  await fs.writeFile(tempFilePath, buffer);

  try {
    const { stdout } = await execFileAsync(pythonPath, [extractorScriptPath, tempFilePath], {
      maxBuffer: 8 * 1024 * 1024,
    });

    return stdout.trim();
  } finally {
    await fs.unlink(tempFilePath).catch(() => {});
  }
};
