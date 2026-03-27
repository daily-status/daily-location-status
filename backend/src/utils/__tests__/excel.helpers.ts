import XLSX from "xlsx";

export const createExcelBuffer = (rows: Record<string, unknown>[]) => {
  const workBook = XLSX.utils.book_new();
  const workSheet = XLSX.utils.json_to_sheet(rows);

  XLSX.utils.book_append_sheet(workBook, workSheet, "Sheet1");

  return XLSX.write(workBook, {
    type: "buffer",
    bookType: "xlsx",
  }) as Buffer;
};