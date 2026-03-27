import z from "zod";
import { DatabaseConfigSchema } from "./services/database";
import { ServerConfigSchema } from "./services/server";
import { SystemConfig } from "./services/system";
import { createValidator } from "./utils/validations";

export const SystemEnvSchema = z.object({
  ...ServerConfigSchema.shape,
  ...DatabaseConfigSchema.shape,
});

export const validateSystemEnv = createValidator(SystemEnvSchema);

export const createSystemConfig = (env: NodeJS.ProcessEnv): SystemConfig => {
  const validated = validateSystemEnv(env);

  return {
    server: {
      PORT: validated.PORT,
    },
    db: {
      DATABASE_URL: validated.DATABASE_URL,
    },
  };
};
