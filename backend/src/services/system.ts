import z from "zod";
import { Server, ServerConfigSchema } from "./server";
import { createDBClient, DatabaseConfigSchema } from "./database";
import { PrismaClient } from "@prisma/client";
import { BackupService } from "./backup";
import logger from "../utils/logger";

export const SystemConfigSchema = z.object({
  server: ServerConfigSchema,
  db: DatabaseConfigSchema,
});

export type SystemConfig = z.infer<typeof SystemConfigSchema>;

export class System {
  private server?: Server;
  private database: PrismaClient;
  private backupService: BackupService | null = null;

  constructor(private config: SystemConfig) {
    this.database = createDBClient(config.db);
  }

  start = () => {
    if (process.env.ENVIRONMENT === "local") {
      this.backupService = new BackupService(this.database);
      this.backupService.start();
      logger.info("BackupService enabled (local environment)");
    } else {
      logger.info(
        `BackupService disabled (environment: ${process.env.ENVIRONMENT})`
      );
    }

    this.server = new Server(
      this.config.server,
      this.database,
      this.backupService,
    );

    this.server.start();
  };

  stop = () => {
    this.backupService?.stop();
    this.server?.stop();
  };
}
