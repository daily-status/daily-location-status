import cors from "cors";
import express, { Express, json, NextFunction, Request, Response } from "express";
import http from "http";
import { StatusCodes } from "http-status-codes";
import { HttpError } from "../utils/errors/types";
import z from "zod";
import { UserDal } from "../modules/User/dal";
import { createUserRouter } from "../modules/User/router";
import logger from "../utils/logger";
import { PrismaClient } from "@prisma/client";
import { LocationDal } from "../modules/Location/dal";
import { createLocationRouter } from "../modules/Location/router";
import { LocationReportDal } from "../modules/LocationReport/dal";
import { createLocationReportRouter } from "../modules/LocationReport/router";
import { TelegramBot } from "./telegram/TelegramBot";
import { BackupService } from "./backup";

export const ServerConfigSchema = z.object({
  PORT: z.coerce.number().positive(),
});

export type ServerConfig = z.infer<typeof ServerConfigSchema>;

export class Server {
  private app: Express;
  private server?: http.Server;
  private telegramBot?: TelegramBot;

  constructor(
    private config: ServerConfig,
    private dbClient: PrismaClient,
    private backupService: BackupService | null
  ) {
    this.app = express();
    this.registerMiddlewares();
    this.registerRoutes();
  }

  private registerMiddlewares = () => {
    this.app.use(json());
    this.app.use(cors());
  };

  private registerRoutes = async () => {
    // Initialize DALs
    const userDal = new UserDal(this.dbClient);
    const locationDal = new LocationDal(this.dbClient);
    const locationReportDal = new LocationReportDal(
      this.dbClient,
      userDal,
      locationDal
    );

    // Register routes — no /api prefix (matches dev branch)
    this.app.use("/users", createUserRouter(userDal));
    this.app.use("/locations", createLocationRouter(locationDal));
    this.app.use("/reports", createLocationReportRouter(locationReportDal, this.backupService));

    this.app.get("/health", (_: Request, res: Response) => {
      res.sendStatus(StatusCodes.OK);
    });

    this.app.use(
      (err: unknown, _req: Request, res: Response, _next: NextFunction) => {
        if (err instanceof HttpError) {
          res.status(err.code).json(err.message);
        } else {
          res.sendStatus(StatusCodes.INTERNAL_SERVER_ERROR);
        }
      }
    );

    // Initialize Telegram Bot
    const telegramBotToken = process.env.TELEGRAM_BOT_TOKEN?.trim();

    if (!telegramBotToken) {
      logger.info("TelegramBot disabled (missing TELEGRAM_BOT_TOKEN)");
      return;
    }

    this.telegramBot = new TelegramBot(
      userDal,
      locationDal,
      locationReportDal,
      telegramBotToken
    );

    try {
      await this.telegramBot.launch();
      logger.info("TelegramBot started");
    } catch (error) {
      logger.error("TelegramBot failed to start", { error });
      this.telegramBot = undefined;
    }
  };

  start = () => {
    this.server = this.app.listen(this.config.PORT, () => {
      logger.info(`server running on port ${this.config.PORT}`);
    });
  };

  stop = () => {
    void this.telegramBot?.stop();
    this.server?.close(() => {
      logger.info(`server gracefully closed`);
    });
  };
}
