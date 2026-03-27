import z from "zod";

export const DailyStatusOkSchema = z.boolean().nullable();

const sources = ["ui", "bot"] as const;
export const ReportSourceSchema = z.enum(sources);

export const PlainLocationReportSchema = z.object({
  userId: z.number(),
  locationId: z.number(),
  occurredAt: z.coerce.date(),
  isStatusOk: DailyStatusOkSchema,
  notes: z.string().nullable().default(null),
  source: ReportSourceSchema,
});

export const PartialLocationReportSchema = PlainLocationReportSchema.partial();

export const DBLocationReportSchema = PlainLocationReportSchema.extend({
    id: z.number(),
    createdAt: z.coerce.date(),
});

export const SearchQueryOptionsSchema = z
  .object({
    userId: z.coerce.number(),
    locationId: z.coerce.number(),
    dailyStatus: z.boolean().nullable(),
    date: z.coerce.date(),
    minDate: z.coerce.date(),
    maxDate: z.coerce.date(),
  })
  .partial();
