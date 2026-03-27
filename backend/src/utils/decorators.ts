import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { HttpError } from "./errors/types";
import logger from "./logger";

type HandlerFunction = (req: Request, res: Response) => void | Promise<void>;

export const httpLogger =
  (handler: HandlerFunction, handlerName: string) =>
  async (req: Request, res: Response) => {
    try {
      const startTimeStamp = Date.now();
      logger.info(`start handler ${handlerName}`, {
        req: {
          method: req.method,
          url: req.path,
          body: req.body,
          query: req.query,
          params: req.params,
        },
      });
      await handler(req, res);

      logger.info(`end handler ${handlerName} successfully`, {
        res: {
          status: res.statusCode,
          durationMS: Date.now() - startTimeStamp,
        },
      });
    } catch (e: unknown) {
      const error = e as Error;
      logger.error(`error with handler ${handlerName}`, {
        name: error.name,
        message: error.message,
      });

      if (e instanceof HttpError) {
        const httpError = e as HttpError;
        res.status(httpError.code).json(httpError.message);
      } else {
        res.sendStatus(StatusCodes.INTERNAL_SERVER_ERROR);
      }
    }
  };
