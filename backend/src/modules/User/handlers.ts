import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import XLSX from "xlsx";
import { ValidationError } from "../../utils/errors/client";
import { entityWithIdValidator } from "../../utils/validations";
import { UserDal } from "./dal";
import { partialPlainUserValidator, PlainUser, plainUserSchemeExcelValidator, plainUserValidator } from "./types";

const EXCEL_COLUMN_MAP: Record<string, keyof PlainUser> = {
  fullname: "fullName",
  "full name": "fullName",
  "שם מלא": "fullName",
  name: "fullName",
  phone: "phone",
  טלפון: "phone",
  mobile: "phone",
};

const normalizeHeader = (header: string) =>
  String(header ?? "")
    .trim()
    .toLowerCase();

const parseExcelToUsers = (filePathOrBuffer: string | Buffer): PlainUser[] => {
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
      if (mapped.fullName && mapped.phone) {
        return { fullName: mapped.fullName, phone: mapped.phone };
      }
      return null;
    })
    .filter((u): u is PlainUser => u !== null);
};

export const getAllUsersHandler =
  (dal: UserDal) => async (_: Request, res: Response) => {
    const users = await dal.getAllUsers();

    res.status(StatusCodes.OK).json(users);
  };

export const getUserByIdHandler =
  (dal: UserDal) => async (req: Request, res: Response) => {
    const { id } = entityWithIdValidator(req.params);

    const user = await dal.getUserById(id);

    res.status(StatusCodes.OK).json(user);
  };

export const updateUser =
  (dal: UserDal) => async (req: Request, res: Response) => {
    const { id } = entityWithIdValidator(req.params);
    const updates = partialPlainUserValidator(req.body);

    await dal.updateUser({ id, ...updates });

    res.sendStatus(StatusCodes.NO_CONTENT);
  };

export const AddUserHandler =
  (dal: UserDal) => async (req: Request, res: Response) => {
    const { fullName, phone } = plainUserValidator(req.body);

    const user = await dal.addUser({ fullName, phone });

    res.status(StatusCodes.CREATED).json(user);
  };

export const AddUsersFromExcelHandler =
  (dal: UserDal) => async (req: Request, res: Response) => {
    if (!req.file?.buffer) {
      throw new ValidationError("No file uploaded. Send form-data with key 'file'.");
    }

    const parsedUsers = parseExcelToUsers(req.file.buffer);
    
    if (!parsedUsers || parsedUsers.length === 0) {
      throw new ValidationError("לא נוצרו משתמשים. בדוק שהקובץ תקין ומכיל עמודות \"שם מלא\" ו\"טלפון\"");
    }

    const usersFromExcel = plainUserSchemeExcelValidator(parsedUsers);
    const result = await dal.addUsersFromExcel(usersFromExcel);
    
    if (result.count === 0) {
      throw new ValidationError("המשתמשים כבר קיימים במערכת");
    }

    res.status(StatusCodes.CREATED).json(`נוצרו ${result.count} משתמשים בהצלחה`);
  };

export const deleteUserHandler =
  (dal: UserDal) => async (req: Request, res: Response) => {
    const { id } = entityWithIdValidator(req.params);

    await dal.deleteUser(id);

    res.sendStatus(StatusCodes.NO_CONTENT);
  };
