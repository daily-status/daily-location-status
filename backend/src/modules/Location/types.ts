import z from "zod";
import { createValidator } from "../../utils/validations";
import {
  DBLocationScheme,
  PlainLocationExcelScheme,
  PlainLocationScheme,
} from "./schemas";

export type PlainLocation = z.infer<typeof PlainLocationScheme>;
export const plainLocationValidator = createValidator(PlainLocationScheme);

export type PlainLocationExcel = z.infer<typeof PlainLocationExcelScheme>;
export const plainLocationSchemeExcelValidator = createValidator(
  PlainLocationExcelScheme
);

export type DBLocation = z.infer<typeof DBLocationScheme>;
export const dbLocationValidator = createValidator(DBLocationScheme);