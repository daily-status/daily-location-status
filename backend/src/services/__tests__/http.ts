import { Request, Response } from "express";

export const createMockRequest = ({
  body = {},
  params = {},
  query = {},
  file,
}: {
  body?: unknown;
  params?: Record<string, string>;
  query?: Record<string, unknown>;
  file?: { buffer: Buffer };
} = {}) => ({ body, params, query, file }) as Request;

export const createMockResponse = () => {
  const response = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    sendStatus: jest.fn().mockReturnThis(),
    setHeader: jest.fn().mockReturnThis(),
    end: jest.fn().mockReturnThis(),
  };

  return response as unknown as Response & {
    status: jest.Mock;
    json: jest.Mock;
    sendStatus: jest.Mock;
    setHeader: jest.Mock;
    end: jest.Mock;
  };
};
