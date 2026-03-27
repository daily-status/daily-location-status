import { Request, Response } from "express";
import XLSX from "xlsx";
import { LocationDal } from "./dal";
import {
  plainLocationValidator,
  plainLocationSchemeExcelValidator,
  PlainLocation,
} from "./types";
import { StatusCodes } from "http-status-codes";
import { entityWithIdValidator } from "../../utils/validations";
import { ValidationError } from "../../utils/errors/client";

const EXCEL_COLUMN_MAP: Record<string, keyof PlainLocation> = {
  name: "name",
  "שם": "name",
  "מיקום": "name",
  location: "name",
  "location name": "name",
};

const normalizeHeader = (header: string) =>
  String(header ?? "")
    .trim()
    .toLowerCase();

const parseExcelToLocations = (filePathOrBuffer: string | Buffer): PlainLocation[] => {
  const workbook =
    typeof filePathOrBuffer === "string"
      ? XLSX.readFile(filePathOrBuffer)
      : XLSX.read(filePathOrBuffer, { type: "buffer" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);

  return rows
    .map((row) => {
      const mapped: Record<string, string> = {};
      for (const [key, value] of Object.entries(row)) {
        const normalized = normalizeHeader(key);
        const field = EXCEL_COLUMN_MAP[normalized];
        if (field && value != null && value !== "") {
          mapped[field] = String(value).trim();
        }
      }
      if (mapped.name) {
        return { name: mapped.name };
      }
      return null;
    })
    .filter((l): l is PlainLocation => l !== null);
};

export const createLocationHandler =
  (dal: LocationDal) => async (req: Request, res: Response) => {
    const { name } = plainLocationValidator(req.body);

    const location = await dal.createLocation(name);

    res.status(StatusCodes.CREATED).json(location);
  };

export const getAllLocationsHandler =
  (dal: LocationDal) => async (_: Request, res: Response) => {
    const locations = await dal.getAllLocations();

    res.status(StatusCodes.OK).json(locations);
  };

export const getLocationByIdHandler =
  (dal: LocationDal) => async (req: Request, res: Response) => {
    const { id } = entityWithIdValidator(req.params);

    const location = await dal.getLocationById(id);

    res.status(StatusCodes.OK).json(location);
  };

export const addLocationsFromExcelHandler =
  (dal: LocationDal) => async (req: Request, res: Response) => {
    if (!req.file?.buffer) {
      throw new ValidationError(
        "No file uploaded. Send form-data with key 'file'."
      );
    }

    const parsedLocations = parseExcelToLocations(req.file.buffer);

    if (!parsedLocations || parsedLocations.length === 0) {
      throw new ValidationError("לא נוצרו מיקומים. בדוק שהקובץ תקין ומכיל עמודת \"שם\" או \"מיקום\"");
    }

    const locationsFromExcel = plainLocationSchemeExcelValidator(parsedLocations);

    const result = await dal.addLocationsFromExcel(locationsFromExcel);

    if (result.count === 0) {
      throw new ValidationError("המיקומים כבר קיימים במערכת");
    }

    res.status(StatusCodes.CREATED).json(result);
  };
export const deleteLocationHandler =
  (dal: LocationDal) => async (req: Request, res: Response) => {
    const { id } = entityWithIdValidator(req.params);

    await dal.deleteLocation(id);

    res.sendStatus(StatusCodes.NO_CONTENT);
  };
