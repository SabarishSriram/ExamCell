const XLSX = require("xlsx");
const fs = require("fs");
const path = require("path");

const folderPath = "../data/II Yr";
const outputWorkbook = XLSX.utils.book_new();
const MAX_SHEET_NAME_LENGTH = 31;

function getUniqueSheetName(baseName, existingNames) {
  let name = baseName.substring(0, MAX_SHEET_NAME_LENGTH);
  let counter = 2;
  while (existingNames.indexOf(name) >= 0) {
    const suffix = ` (${counter})`;
    name = (baseName.substring(0, MAX_SHEET_NAME_LENGTH - suffix.length) + suffix).substring(0, MAX_SHEET_NAME_LENGTH);
    counter++;
  }
  return name;
}

fs.readdirSync(folderPath).forEach((file) => {
  const filePath = path.join(folderPath, file);

  if (file.endsWith(".xlsx") || file.endsWith(".csv")) {
    const workbook = XLSX.readFile(filePath);
    const baseName = path.basename(file, path.extname(file));
    const sheetName = getUniqueSheetName(baseName, outputWorkbook.SheetNames);

    const firstSheet = workbook.SheetNames[0];
    const sheet = workbook.Sheets[firstSheet];

    XLSX.utils.book_append_sheet(outputWorkbook, sheet, sheetName);
  }
});

XLSX.writeFile(outputWorkbook, "Combined_Output.xlsx");
console.log("Done!");
