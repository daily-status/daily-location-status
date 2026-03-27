import { Prisma, PrismaClient } from "@prisma/client";
import { DBLocationReport, PartialLocationReport, PlainLocationReport } from "./types";
import { NoContentError, NotFoundError } from "../../utils/errors/client";
import { SearchQueryOptions } from "./types";
import moment from "moment";
import { UserDal } from "../User/dal";
import { LocationDal } from "../Location/dal";
import { Workbook } from "exceljs";

// Temporary compatibility layer until the DB includes LocationReport.notes.
const locationReportLegacySelect = {
  id: true,
  userId: true,
  locationId: true,
  occurredAt: true,
  createdAt: true,
  isStatusOk: true,
  source: true,
} satisfies Prisma.LocationReportSelect;

type LocationReportLegacyRecord = Prisma.LocationReportGetPayload<{
  select: typeof locationReportLegacySelect;
}>;

const withoutLegacyNotes = <T extends { notes?: string | null }>(data: T) => {
  const { notes: _notes, ...compatibleData } = data;
  return compatibleData;
};

const withNotesPlaceholder = (
  report: LocationReportLegacyRecord
): DBLocationReport => ({
  ...report,
  notes: null,
});

export class LocationReportDal {
  private model;
  constructor(
    prisma: PrismaClient,
    private userDal: UserDal,
    private locationDal: LocationDal
  ) {
    this.model = prisma.locationReport;
  }

  private findManyCompatible = (where: Prisma.LocationReportWhereInput) =>
    this.model.findMany({
      where,
      select: locationReportLegacySelect,
    });

  private findUniqueCompatible = (id: number) =>
    this.model.findUnique({
      where: { id },
      select: locationReportLegacySelect,
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
    return reports.map(withNotesPlaceholder);
  };

  createExcelExport = async (params: SearchQueryOptions): Promise<Workbook> => {
    const reports = await this.getAllReports(params);

    if (reports.length === 0) throw new NoContentError("אין דוחות להצגה");

    const workBook = new Workbook();
    const sheet = workBook.addWorksheet('דיווח');

    const rows = await Promise.all(reports.map(async row => {
      const user = await this.userDal.getUserById(row.userId);
      const location = await this.locationDal.getLocationById(row.locationId);
      return [
        user.fullName,
        location.name,
        row.occurredAt.toLocaleDateString('he-IL', { timeZone: 'Asia/Jerusalem' }),
        row.occurredAt.toLocaleTimeString('he-IL', { timeZone: 'Asia/Jerusalem' }),
        row.isStatusOk === true ? "תקין" : row.isStatusOk === false ? "לא תקין" : "לא הוזן",
        row.notes,
        row.source,
      ];
    }));

    sheet.addTable({
      name: 'ReportsTable',
      ref: 'A1',
      headerRow: true,
      style: {
        theme: 'TableStyleMedium2',
        showRowStripes: true,
        showColumnStripes: false,
        showFirstColumn: true,
        showLastColumn: true,
      },
      columns: [
        { name: 'שם משתמש', filterButton: true },
        { name: 'מיקום', filterButton: true },
        { name: 'תאריך', filterButton: true },
        { name: 'שעה', filterButton: true },
        { name: 'סטטוס', filterButton: true },
        { name: 'הערות', filterButton: true },
        { name: 'מקור', filterButton: true },
      ],
      rows,
    });

    sheet.columns.forEach(column => {
      let maxLength = 0;
      column.values?.forEach(value => {
        if (value && value!.toString().length > maxLength) {
          maxLength = value!.toString().length;
        }
      });
      column.width = maxLength + 5;
    });

    return workBook;
  }

  getReportById = async (id: number): Promise<DBLocationReport> => {
    const report = await this.findUniqueCompatible(id);

    if (!report) {
      throw new NotFoundError("LocationReport", id.toString());
    }

    return withNotesPlaceholder(report);
  };

  addReport = async (data: PlainLocationReport): Promise<DBLocationReport> => {
    
    const existingUserId = await this.userDal.getUserById(data.userId);
    const existingLocationId = await this.locationDal.getLocationById(data.locationId);

    if (!existingUserId || !existingLocationId) {
      throw new NotFoundError("Not Found", !existingUserId && !existingLocationId? `Location ${data.locationId.toString()} and User ${data.userId.toString()}` : existingLocationId? `User ${data.userId.toString()}` : `Location ${data.locationId.toString()}`);
    }

    const report = await this.model.create({
      data: withoutLegacyNotes(data),
      select: locationReportLegacySelect,
    });

    return withNotesPlaceholder(report);
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
      data: withoutLegacyNotes(data),
      select: locationReportLegacySelect,
    });

    return withNotesPlaceholder(report);
  };

  deleteReport = async (id: number): Promise<void> => {
    await this.getReportById(id);
    await this.model.delete({
      where: { id },
      select: locationReportLegacySelect,
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
