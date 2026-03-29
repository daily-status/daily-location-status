import { Prisma, PrismaClient } from "@prisma/client";
import { DBLocationReport, PartialLocationReport, PlainLocationReport } from "./types";
import { NoContentError, NotFoundError } from "../../utils/errors/client";
import { SearchQueryOptions } from "./types";
import moment from "moment";
import { UserDal } from "../User/dal";
import { LocationDal } from "../Location/dal";
import { Workbook } from "exceljs";
import { createExcelExportWorkbook } from "./excel";

const locationReportSelect = {
  id: true,
  userId: true,
  locationId: true,
  occurredAt: true,
  createdAt: true,
  isStatusOk: true,
  notes: true,
  source: true,
} satisfies Prisma.LocationReportSelect;

export class LocationReportDal {
  private model;
  constructor(
    private prisma: PrismaClient,
    private userDal: UserDal,
    private locationDal: LocationDal
  ) {
    this.model = prisma.locationReport;
  }

  private findManyCompatible = (where: Prisma.LocationReportWhereInput) =>
    this.model.findMany({
      where,
      select: locationReportSelect,
    });

  private findUniqueCompatible = (id: number) =>
    this.model.findUnique({
      where: { id },
      select: locationReportSelect,
    });

  getAllReports = async (
    params: SearchQueryOptions,
  ): Promise<DBLocationReport[]> => {
    const where: Prisma.LocationReportWhereInput = {};

    if (params.userId !== undefined) {
      where.userId = params.userId;
    }

    if (params.locationId !== undefined) {
      where.locationId = params.locationId;
    }

    if (params.dailyStatus !== undefined) {
      where.isStatusOk = params.dailyStatus;
    }

    if (params.date || params.minDate || params.maxDate) {
      const baseDate = params.date ?? new Date();
      const minDate = moment(params.minDate ?? baseDate)
        .startOf("day")
        .toDate();
      const maxDate = moment(params.maxDate ?? baseDate)
        .startOf("day")
        .add(1, "day")
        .toDate();

      where.occurredAt = {
        gte: minDate,
        lt: maxDate,
      };
    }

    const reports = await this.findManyCompatible(where);
    return reports;
  };

  createExcelExport = async (params: SearchQueryOptions): Promise<Workbook> => {
    return createExcelExportWorkbook(this.prisma, params);
  };

  getReportById = async (id: number): Promise<DBLocationReport> => {
    const report = await this.findUniqueCompatible(id);

    if (!report) {
      throw new NotFoundError("LocationReport", id.toString());
    }

    return report;
  };

  addReport = async (data: PlainLocationReport): Promise<DBLocationReport> => {
    
    const existingUserId = await this.userDal.getUserById(data.userId);
    const existingLocationId = await this.locationDal.getLocationById(data.locationId);

    if (!existingUserId || !existingLocationId) {
      throw new NotFoundError("Not Found", !existingUserId && !existingLocationId? `Location ${data.locationId.toString()} and User ${data.userId.toString()}` : existingLocationId? `User ${data.userId.toString()}` : `Location ${data.locationId.toString()}`);
    }

    const report = await this.model.create({
      data,
      select: locationReportSelect,
    });

    return report;
  };

  updateReport = async (
    id: number,
    data: PartialLocationReport
  ): Promise<DBLocationReport> => {
    const existingReport = await this.getReportById(id);
    const nextUserId = data.userId ?? existingReport.userId;
    const nextLocationId = data.locationId ?? existingReport.locationId;

    await this.userDal.getUserById(nextUserId);
    await this.locationDal.getLocationById(nextLocationId);

    const report = await this.model.update({
      where: { id },
      data,
      select: locationReportSelect,
    });

    return report;
  };

  deleteReport = async (id: number): Promise<void> => {
    await this.getReportById(id);
    await this.model.delete({
      where: { id },
      select: locationReportSelect,
    });
  };

  getDailySummaryData = async (date: Date) => {
    const where =  {
        occurredAt: {
          gte: moment(date).startOf('day').toDate(),
          lt: moment(date).startOf('date').add(1, 'day').toDate(),
        }
      }

    const reportsCounts = await this.model.groupBy({
      by: ['userId'],
      _count: {
        id: true,
      },
      where,
    });
  }
}
