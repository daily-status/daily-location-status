import { StatusCodes } from "http-status-codes";
import { createExcelBuffer } from "../../../utils/__tests__/excel.helpers";
import {
  disconnectTestDatabase,
  resetTestDatabase,
  testDBClient,
} from "../../../services/__tests__/database";
import {
  createMockRequest,
  createMockResponse,
} from "../../../services/__tests__/http";
import { NotFoundError, ValidationError } from "../../../utils/errors/client";
import { UserDal } from "../dal";
import {
  AddUserHandler,
  AddUsersFromExcelHandler,
  getAllUsersHandler,
  getUserByIdHandler,
  updateUser,
} from "../handlers";
import { PlainUser } from "../types";

const validUser: PlainUser = {
  fullName: "Name Last",
  phone: "0501234567",
};

const secondValidUser: PlainUser = {
  fullName: "Updated Name",
  phone: "0509876543",
};

const userArray: PlainUser[] = [ validUser, secondValidUser];

const RANDOM_NUMERICAL_ID = 99999999;

describe("user handlers", () => {
  const userDal = new UserDal(testDBClient);

  beforeEach(async () => {
    await resetTestDatabase();
  });

  afterAll(async () => {
    await disconnectTestDatabase();
  });

  test("getAllUsersHandler returns an empty array when there are no users", async () => {
    const req = createMockRequest();
    const res = createMockResponse();

    await getAllUsersHandler(userDal)(req, res);

    expect(res.status).toHaveBeenCalledWith(StatusCodes.OK);
    expect(res.json).toHaveBeenCalledWith([]);
  });

  test("getAllUsersHandler returns users that exist in the database", async () => {
    await testDBClient.user.createMany({
      data: [validUser, secondValidUser],
    });
    const createdUsers = await testDBClient.user.findMany();
    const req = createMockRequest();
    const res = createMockResponse();

    await getAllUsersHandler(userDal)(req, res);

    expect(res.status).toHaveBeenCalledWith(StatusCodes.OK);
    expect(res.json).toHaveBeenCalledWith(createdUsers);
  });

  test("getUserByIdHandler returns a user when the id exists", async () => {
    const createdUser = await testDBClient.user.create({
      data: validUser,
    });
    const req = createMockRequest({
      params: { id: createdUser.id.toString() },
    });
    const res = createMockResponse();

    await getUserByIdHandler(userDal)(req, res);

    expect(res.status).toHaveBeenCalledWith(StatusCodes.OK);
    expect(res.json).toHaveBeenCalledWith(createdUser);
  });

  test("getUserByIdHandler throws not found when the id does not exist", async () => {
    const req = createMockRequest({
      params: { id: RANDOM_NUMERICAL_ID.toString() },
    });
    const res = createMockResponse();

    await expect(getUserByIdHandler(userDal)(req, res)).rejects.toThrow(
      NotFoundError
    );
  });

  test("AddUserHandler creates a new user", async () => {
    const req = createMockRequest({
      body: validUser,
    });
    const res = createMockResponse();

    await AddUserHandler(userDal)(req, res);

    expect(res.status).toHaveBeenCalledWith(StatusCodes.CREATED);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining(validUser)
    );
  });

  test("AddUserHandler throws an error when the body is invalid", async () => {
    const req = createMockRequest({
      body: { randomVal: "random" },
    });
    const res = createMockResponse();

    await expect(AddUserHandler(userDal)(req, res)).rejects.toThrow(
      ValidationError
    );
  });

  test("AddUsersFromExcelHandler creates users from an excel file", async () => {
    const req = createMockRequest({
      file: {
        buffer: createExcelBuffer(userArray),
      },
    });
    const res = createMockResponse();

    await AddUsersFromExcelHandler(userDal)(req, res);

    expect(res.status).toHaveBeenCalledWith(StatusCodes.CREATED);
    expect(res.json).toHaveBeenCalledWith({ count: userArray.length });

    const users = await testDBClient.user.findMany();
    expect(users).toHaveLength(userArray.length);
    expect(users).toEqual(
      expect.arrayContaining([
        expect.objectContaining(validUser),
        expect.objectContaining(secondValidUser),
      ])
    );
  });

  test("AddUsersFromExcelHandler throws an error when no file is uploaded", async () => {
    const req = createMockRequest();
    const res = createMockResponse();

    await expect(AddUsersFromExcelHandler(userDal)(req, res)).rejects.toThrow(
      ValidationError
    );
  });

  test("updateUser updates an existing user", async () => {
    const user = await testDBClient.user.create({
      data: validUser,
    });
    const req = createMockRequest({
      params: { id: user.id.toString() },
      body: secondValidUser,
    });
    const res = createMockResponse();

    await updateUser(userDal)(req, res);

    expect(res.sendStatus).toHaveBeenCalledWith(StatusCodes.NO_CONTENT);

    const updatedUser = await testDBClient.user.findUnique({
      where: { id: user.id },
    });

    expect(updatedUser).toMatchObject({
      id: user.id,
      ...secondValidUser,
    });
  });

  test("updateUser throws an error when the body is invalid", async () => {
    const user = await testDBClient.user.create({
      data: validUser,
    });
    const req = createMockRequest({
      params: { id: user.id.toString() },
      body: { phone: 12345 },
    });
    const res = createMockResponse();

    await expect(updateUser(userDal)(req, res)).rejects.toThrow(
      ValidationError
    );
  });

  test("updateUser throws not found when the user does not exist", async () => {
    const req = createMockRequest({
      params: { id: RANDOM_NUMERICAL_ID.toString() },
      body: secondValidUser,
    });
    const res = createMockResponse();

    await expect(updateUser(userDal)(req, res)).rejects.toThrow(NotFoundError);
  });
});
