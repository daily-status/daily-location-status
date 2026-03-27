import { StatusCodes } from "http-status-codes";
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
import { LocationDal } from "../../Location/dal";
import { UserDal } from "../../User/dal";
import { LocationReportDal } from "../dal";
import {
  addReportHandler,
  getReportByIdHandler,
  getReportsHandler,
} from "../handlers";
import { PlainUser } from "../../User/types";
import { PlainLocation } from "../../Location/types";

const validUser: PlainUser = {
  fullName: "Name Example",
  phone: "0501234567",
};

const validLocation : PlainLocation= {
  name: "Home",
};

const RANDOM_ID: number = 99999999;


describe("location report handlers", () => {
  const userDal = new UserDal(testDBClient);
  const locationDal = new LocationDal(testDBClient);
  const locationReportDal = new LocationReportDal(
    testDBClient,
    userDal,
    locationDal
  );

  beforeEach(async () => {
    await resetTestDatabase();
  });

  afterAll(async () => {
    await disconnectTestDatabase();
  });

  test("getReportsHandler returns an empty array when there are no reports", async () => {
    const req = createMockRequest();
    const res = createMockResponse();

    await getReportsHandler(locationReportDal)(req, res);

    expect(res.status).toHaveBeenCalledWith(StatusCodes.OK);
    expect(res.json).toHaveBeenCalledWith([]);
  });

  test("getReportsHandler returns reports that exist in the database", async () => {
    const user = await testDBClient.user.create({
      data: validUser,
    });
    const location = await testDBClient.location.create({
      data: validLocation,
    });
    const createdReport = await testDBClient.locationReport.create({
      data: {
        userId: user.id,
        locationId: location.id,
        occurredAt: new Date("2026-03-24T08:00:00.000Z"),
        isStatusOk: true,
        source: "ui",
      },
    });
    const req = createMockRequest();
    const res = createMockResponse();

    await getReportsHandler(locationReportDal)(req, res);

    expect(res.status).toHaveBeenCalledWith(StatusCodes.OK);
    expect(res.json).toHaveBeenCalledWith([createdReport]);
  });

  test("getReportByIdHandler returns a report when the id exists", async () => {
    const user = await testDBClient.user.create({
      data: validUser,
    });
    const location = await testDBClient.location.create({
      data: validLocation,
    });
    const createdReport = await testDBClient.locationReport.create({
      data: {
        userId: user.id,
        locationId: location.id,
        occurredAt: new Date("2026-03-24T08:00:00.000Z"),
        isStatusOk: true,
        source: "ui",
      },
    });
    const req = createMockRequest({
      params: { id: createdReport.id.toString() },
    });
    const res = createMockResponse();

    await getReportByIdHandler(locationReportDal)(req, res);

    expect(res.status).toHaveBeenCalledWith(StatusCodes.OK);
    expect(res.json).toHaveBeenCalledWith(createdReport);
  });

  test("getReportByIdHandler throws not found when the id does not exist", async () => {
    const req = createMockRequest({
      params: { id: RANDOM_ID.toString() },
    });
    const res = createMockResponse();

    await expect(getReportByIdHandler(locationReportDal)(req, res)).rejects.toThrow(
      NotFoundError
    );
  });

  test("addReportHandler creates a new report", async () => {
    const user = await testDBClient.user.create({
      data: validUser,
    });
    const location = await testDBClient.location.create({
      data: validLocation,
    });
    const req = createMockRequest({
      body: {
        userId: user.id,
        locationId: location.id,
        occurredAt: "2026-03-24T08:00:00.000Z",
        isStatusOk: true,
        source: "ui",
      },
    });
    const res = createMockResponse();

    await addReportHandler(locationReportDal)(req, res);

    expect(res.status).toHaveBeenCalledWith(StatusCodes.CREATED);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: user.id,
        locationId: location.id,
        isStatusOk: true,
        source: "ui",
      })
    );
  });

  test("addReportHandler throws an error when the body is invalid", async () => {
    const req = createMockRequest({
      body: { randomVal: "random" },
    });
    const res = createMockResponse();

    await expect(addReportHandler(locationReportDal)(req, res)).rejects.toThrow(
      ValidationError
    );
  });

  test("addReportHandler throws not found when the user does not exist", async () => {
    const location = await testDBClient.location.create({
      data: validLocation,
    });
    const req = createMockRequest({
      body: {
        userId: RANDOM_ID,
        locationId: location.id,
        occurredAt: "2026-03-24T08:00:00.000Z",
        isStatusOk: true,
        source: "ui",
      },
    });
    const res = createMockResponse();

    await expect(addReportHandler(locationReportDal)(req, res)).rejects.toThrow(
      NotFoundError
    );
  });

  test("addReportHandler throws not found when the location does not exist", async () => {
    const user = await testDBClient.user.create({
      data: validUser,
    });
    const req = createMockRequest({
      body: {
        userId: user.id,
        locationId: RANDOM_ID,
        occurredAt: "2026-03-24T08:00:00.000Z",
        isStatusOk: true,
        source: "ui",
      },
    });
    const res = createMockResponse();

    await expect(addReportHandler(locationReportDal)(req, res)).rejects.toThrow(
      NotFoundError
    );
  });
});
