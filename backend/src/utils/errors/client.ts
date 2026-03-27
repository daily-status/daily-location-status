import { StatusCodes } from "http-status-codes";
import { HttpError } from "./types";

export class ClientError extends HttpError {
    constructor(message: string, code = StatusCodes.BAD_REQUEST) {
        super(code, message);
    }
}

export class NotFoundError extends ClientError {
    constructor(entityName: string, id: string) {
        super(`couldn't find ${entityName} with id: '${id}'`, StatusCodes.NOT_FOUND);
    }
}

export class ValidationError extends ClientError {
    constructor(message: string) {
        super(message, StatusCodes.UNPROCESSABLE_ENTITY);
    }
}

export class AlreadyExistsError extends ClientError {
    constructor(entityName: string, field: string, value: string) {
        super(`${entityName} with ${field}: '${value}' already exists`, StatusCodes.CONFLICT);
    }
}

export class NoContentError extends ClientError {
    constructor(message: string) {
        super(message, StatusCodes.NO_CONTENT);
    }
}