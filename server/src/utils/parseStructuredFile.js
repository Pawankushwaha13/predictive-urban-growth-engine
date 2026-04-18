import path from "path";

import XLSX from "xlsx";

export const parseStructuredFile = (buffer, fileName) => {
  const extension = path.extname(fileName || "").toLowerCase();

  if (extension === ".json") {
    const parsed = JSON.parse(buffer.toString("utf8"));
    if (Array.isArray(parsed)) {
      return parsed;
    }

    if (Array.isArray(parsed.records)) {
      return parsed.records;
    }

    return [parsed];
  }

  if ([".csv", ".xlsx", ".xls", ".xlsm"].includes(extension)) {
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const firstSheet = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheet];
    return XLSX.utils.sheet_to_json(worksheet, { defval: "" });
  }

  throw new Error("Unsupported file type. Upload CSV, Excel, or JSON files.");
};

