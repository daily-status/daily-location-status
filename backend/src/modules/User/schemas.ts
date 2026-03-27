import z from 'zod';

export const PlainUserScheme = z.object({
    fullName: z.string(),
    phone: z.string()
    .regex(/^(\+9725\d{8}|05\d{8})$/)
    .transform(val => val.startsWith('+972') ? ('0' + val.slice(4)) : val),
});

export const PartialPlainUserScheme = PlainUserScheme.partial();

export const DBUserScheme = PlainUserScheme.extend({
    id: z.number(),
    telegramUserId: z.string().nullable(),
    phone: z.string()
});

export const PlainUserExcelScheme = z.array(PlainUserScheme);