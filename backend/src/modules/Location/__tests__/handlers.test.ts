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
import { LocationDal } from "../dal";
import {
  addLocationsFromExcelHandler,
  createLocationHandler,
  deleteLocationHandler,
  getAllLocationsHandler,
  getLocationByIdHandler,
} from "../handlers";
import { PlainLocation } from "../types";

const validLocation: PlainLocation= {
  name: "Home",
};

const secondValidLocation: PlainLocation = {
  name: "Base",
};

const locationArray: PlainLocation[] = [ validLocation, secondValidLocation];

const RANDOM_NUMERICAL_ID = 99999999;

describe("location handlers", () => {
  const locationDal = new LocationDal(testDBClient);

  beforeEach(async () => {
    await resetTestDatabase();
  });

  afterAll(async () => {
    await disconnectTestDatabase();
  });

  test("getAllLocationsHandler returns an empty array when there are no locations", async () => {
    const req = createMockRequest();
    const res = createMockResponse();

    await getAllLocationsHandler(locationDal)(req, res);

    expect(res.status).toHaveBeenCalledWith(StatusCodes.OK);
    expect(res.json).toHaveBeenCalledWith([]);
  });

  test("getAllLocationsHandler returns locations that exist in the database", async () => {
    await testDBClient.location.createMany({
      data: [validLocation, secondValidLocation],
    });
    const createdLocations = await testDBClient.location.findMany();
    const req = createMockRequest();
    const res = createMockResponse();

    await getAllLocationsHandler(locationDal)(req, res);

    expect(res.status).toHaveBeenCalledWith(StatusCodes.OK);
    expect(res.json).toHaveBeenCalledWith(createdLocations);
  });

  test("getLocationByIdHandler returns a location when the id exists", async () => {
    const createdLocation = await testDBClient.location.create({
      data: validLocation,
    });
    const req = createMockRequest({
      params: { id: createdLocation.id.toString() },
    });
    const res = createMockResponse();

    await getLocationByIdHandler(locationDal)(req, res);

    expect(res.status).toHaveBeenCalledWith(StatusCodes.OK);
    expect(res.json).toHaveBeenCalledWith(createdLocation);
  });

  test("getLocationByIdHandler throws not found when the id does not exist", async () => {
    const req = createMockRequest({
      params: { id: RANDOM_NUMERICAL_ID.toString() },
    });
    const res = createMockResponse();

    await expect(getLocationByIdHandler(locationDal)(req, res)).rejects.toThrow(
      NotFoundError
    );
  });

  test("createLocationHandler creates a new location", async () => {
    const req = createMockRequest({
      body: validLocation,
    });
    const res = createMockResponse();

    await createLocationHandler(locationDal)(req, res);

    expect(res.status).toHaveBeenCalledWith(StatusCodes.CREATED);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining(validLocation)
    );
  });

  test("createLocationHandler throws an error when the body is invalid", async () => {
    const req = createMockRequest({
      body: { randomVal: "random" },
    });
    const res = createMockResponse();

    await expect(createLocationHandler(locationDal)(req, res)).rejects.toThrow(
      ValidationError
    );
  });

  test("addLocationsFromExcelHandler creates locations from an excel file", async () => {
    const req = createMockRequest({
      file: {
        buffer: createExcelBuffer(locationArray),
      },
    });
    const res = createMockResponse();

    await addLocationsFromExcelHandler(locationDal)(req, res);

    expect(res.status).toHaveBeenCalledWith(StatusCodes.CREATED);
    expect(res.json).toHaveBeenCalledWith({ count: locationArray.length });

    const locations = await testDBClient.location.findMany();
    expect(locations).toHaveLength(locationArray.length);
    expect(locations).toEqual(
      expect.arrayContaining([
        expect.objectContaining(validLocation),
        expect.objectContaining(secondValidLocation),
      ])
    );
  });

  test("addLocationsFromExcelHandler throws an error when no file is uploaded", async () => {
    const req = createMockRequest();
    const res = createMockResponse();

    await expect(
      addLocationsFromExcelHandler(locationDal)(req, res)
    ).rejects.toThrow(ValidationError);
  });

  test("deleteLocationHandler deletes an existing location", async () => {
    const createdLocation = await testDBClient.location.create({
      data: validLocation,
    });
    const req = createMockRequest({
      params: { id: createdLocation.id.toString() },
    });
    const res = createMockResponse();

    await deleteLocationHandler(locationDal)(req, res);

    expect(res.sendStatus).toHaveBeenCalledWith(StatusCodes.NO_CONTENT);

    const deletedLocation = await testDBClient.location.findUnique({
      where: { id: createdLocation.id },
    });

    expect(deletedLocation).toBeNull();
  });

  test("deleteLocationHandler throws not found when the id does not exist", async () => {
    const req = createMockRequest({
      params: { id: RANDOM_NUMERICAL_ID.toString() },
    });
    const res = createMockResponse();

    await expect(deleteLocationHandler(locationDal)(req, res)).rejects.toThrow(
      NotFoundError
    );
  });
});
