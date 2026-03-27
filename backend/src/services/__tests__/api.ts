import cors from "cors";
import express, { Express, json, NextFunction, Request, Response, Router } from "express";
import http from "http";
import { StatusCodes } from "http-status-codes";
import { HttpError } from "../../utils/errors/types";

export const createTestApp = (basePath: string, router: Router): Express => {
  const app = express();

  app.use(json());
  app.use(cors());
  app.use(basePath, router);
  app.use("/health", (_req: Request, res: Response) => {
    res.sendStatus(StatusCodes.OK);
  });
  app.use(
    (err: unknown, _req: Request, res: Response, _next: NextFunction) => {
      if (err instanceof HttpError) {
        res.status(err.code).json(err.message);
        return;
      }

      res.sendStatus(StatusCodes.INTERNAL_SERVER_ERROR);
    }
  );

  return app;
};

export const startTestServer = async (
  app: Express
): Promise<{ baseUrl: string; close: () => Promise<void> }> => {
  const server = http.createServer(app);

  await new Promise<void>((resolve) => {
    server.listen(0, "127.0.0.1", () => resolve());
  });

  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Unable to determine test server address");
  }

  return {
    baseUrl: `http://127.0.0.1:${address.port}`,
    close: async () => {
      await new Promise<void>((resolve, reject) => {
        server.close((error) => {
          if (error) {
            reject(error);
            return;
          }
          resolve();
        });
      });
    },
  };
};
