import { PrismaClient } from "@prisma/client";
import { DBLocation, PlainLocation } from "./types";
import {
  NotFoundError,
  AlreadyExistsError,
  ValidationError,
} from "../../utils/errors/client";

export class LocationDal {
  private model;
  private reportModel;
  constructor(prisma: PrismaClient) {
    this.model = prisma.location;
    this.reportModel = prisma.locationReport;
  }

  getAllLocations = (): Promise<DBLocation[]> => this.model.findMany();

  getLocationById = async (id: number): Promise<DBLocation> => {
    const location = await this.model.findUnique({ where: { id } });

    if (!location) {
      throw new NotFoundError("Location", id.toString());
    }

    return location;
  };

  createLocation = async (name: string): Promise<DBLocation> => {
    const existingLocation = await this.model.findUnique({ where: { name } });

    if (existingLocation) {
      throw new AlreadyExistsError("Location", "name", name);
    }

    return this.model.create({ data: { name } });
  };

  addLocationsFromExcel = async (locations: PlainLocation[]) => {
    if (locations.length === 0) {
      return { count: 0 };
    }
    return await this.model.createMany({
      data: locations,
      skipDuplicates: true,
    });
  };
  deleteLocation = async (id: number): Promise<void> => {
    const existing = await this.model.findUnique({ where: { id } });

    if (!existing) {
      throw new NotFoundError("Location", id.toString());
    }

    const relatedReportsCount = await this.reportModel.count({
      where: { locationId: id },
    });

    if (relatedReportsCount > 0) {
      throw new ValidationError(
        "לא ניתן למחוק מיקום שכבר קיים בדיווחים. מחק או ערוך קודם את הדיווחים המשויכים אליו."
      );
    }

    await this.model.delete({ where: { id } });
  };
}
