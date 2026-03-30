import z from "zod";

const normalizePhone = (raw: string) => {
  let digits = String(raw).replace(/\D/g, "");

  if (digits.startsWith("00972")) digits = digits.slice(5);
  else if (digits.startsWith("972")) digits = digits.slice(3);

  if (digits.startsWith("05") && digits.length === 11) {
    digits = digits.slice(1);
  }

  if (digits.length === 9 && digits.startsWith("5")) {
    digits = `0${digits}`;
  }

  return digits;
};

export const PlainUserScheme = z.object({
  fullName: z.string(),
  phone: z.preprocess(
    normalizePhone,
    z
      .string()
      .regex(/^05\d{8}$/, "מספר טלפון לא תקין - חייב להיות בפורמט 05XXXXXXXX"),
  ),
});

export const PartialPlainUserScheme = PlainUserScheme.partial();

export const DBUserScheme = PlainUserScheme.extend({
  id: z.number(),
  telegramUserId: z.string().nullable(),
  phone: z.string(),
});

export const PlainUserExcelScheme = z.array(PlainUserScheme);
