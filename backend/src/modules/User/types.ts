import z from 'zod';
import { createValidator } from '../../utils/validations';
import { DBUserScheme, PartialPlainUserScheme, PlainUserExcelScheme, PlainUserScheme } from './schemas';

export type PlainUser = z.infer<typeof PlainUserScheme>;
export const plainUserValidator = createValidator(PlainUserScheme);

export type DBUser = z.infer<typeof DBUserScheme>;
export const dbUserValidator = createValidator(DBUserScheme);

export type PartialPlainUser = z.infer<typeof PartialPlainUserScheme>;
export const partialPlainUserValidator = createValidator(PartialPlainUserScheme);

export type PlainUserExcel = z.infer<typeof PlainUserExcelScheme>;
export const plainUserSchemeExcelValidator = createValidator(PlainUserExcelScheme);