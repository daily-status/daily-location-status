import { z } from "zod";
import { ValidationError } from "./errors/client";

export const createValidator = <T extends z.ZodType>(schema: T) => {
  return (input: unknown): z.infer<T> => {
    const { error, data } = schema.safeParse(input);

    if (error) {
      throw new ValidationError(error.message);
    }

    return data;
  };
};

export const entityWithIdValidator = createValidator(
  z.object({ id: z.coerce.number() }),
);
