import multer from "multer";
import { MAX_EXCEL_UPLOAD_SIZE_BYTES } from "./constants";
import { ValidationError } from "./errors/client";

export const excelUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_EXCEL_UPLOAD_SIZE_BYTES },
  fileFilter: (_, file, cb) => {
    const allowed = [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
    ];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new ValidationError("Only .xlsx and .xls files are allowed"));
    }
  },
});
