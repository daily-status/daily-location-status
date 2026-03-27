import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "@prisma/client";
import z from "zod";

export const DatabaseConfigSchema = z.object({
    DATABASE_URL: z.url()
});
export type DatabaseConfig = z.infer<typeof DatabaseConfigSchema>;

export const normalizeDatabaseUrl = (databaseUrl: string) =>
  databaseUrl.replace(/^mysql:\/\//, "mariadb://");

export const createDBClient = (config: DatabaseConfig) => 
    new PrismaClient({adapter:
        new PrismaMariaDb(normalizeDatabaseUrl(config.DATABASE_URL))
    });
