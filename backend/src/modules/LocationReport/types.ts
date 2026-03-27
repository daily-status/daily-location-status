import z from "zod";
import { createValidator } from "../../utils/validations";
import {
  DBLocationReportSchema,
  PartialLocationReportSchema,
  PlainLocationReportSchema,
  ReportSourceSchema,
  SearchQueryOptionsSchema,
} from "./schema";

export type ReportSource = z.infer<typeof ReportSourceSchema>;

export type PlainLocationReport = z.infer<typeof PlainLocationReportSchema>;
export type PartialLocationReport = z.infer<typeof PartialLocationReportSchema>;

export type DBLocationReport = z.infer<typeof DBLocationReportSchema>;

export type SearchQueryOptions = z.infer<typeof SearchQueryOptionsSchema>;

export const plainLocationReportValidator = createValidator(
  PlainLocationReportSchema
);
export const partialLocationReportValidator = createValidator(
  PartialLocationReportSchema
);
export const searchQueryOptionsValidator = createValidator(
    SearchQueryOptionsSchema
);
