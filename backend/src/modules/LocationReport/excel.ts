import { PrismaClient } from "@prisma/client";
import { Workbook } from "exceljs";
import type { TableColumnProperties, Worksheet } from "exceljs";
import moment from "moment";
import { NoContentError } from "../../utils/errors/client";
import type { SearchQueryOptions } from "./types";

const JERUSALEM_TIMEZONE = "Asia/Jerusalem";
const MISSING_LOCATION_LABEL = "לא הוזן";
const MISSING_STATUS_LABEL = "לא הוזן";

type SnapshotReportRecord = {
  id: number;
  userId: number;
  occurredAt: Date;
  createdAt: Date;
  isStatusOk: boolean | null;
  source: string;
  notes: string | null;
  user: {
    fullName: string;
    phone: string;
  };
  location: {
    id: number;
    name: string;
  };
};

const formatStatus = (isStatusOk: boolean | null | undefined) => {
  if (isStatusOk === true) {
    return "תקין";
  }

  if (isStatusOk === false) {
    return "לא תקין";
  }

  return MISSING_STATUS_LABEL;
};

const formatNotes = (value?: string | null) => {
  const normalized = String(value || "").trim();
  return normalized || "-";
};

const formatTimestamp = (value?: Date | null) => {
  if (!value) {
    return "-";
  }

  return value.toLocaleString("he-IL", {
    timeZone: JERUSALEM_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const sortByName = <T extends { fullName: string }>(left: T, right: T) =>
  left.fullName.localeCompare(right.fullName, "he");

const autoFitColumns = (worksheet: Worksheet) => {
  worksheet.columns.forEach((column) => {
    let maxLength = 10;

    column.eachCell?.({ includeEmpty: true }, (cell) => {
      const value = cell.value == null ? "" : String(cell.value);
      maxLength = Math.max(maxLength, value.length);
    });

    column.width = Math.min(maxLength + 4, 40);
  });
};

const addWorksheetTable = (
  worksheet: Worksheet,
  tableName: string,
  ref: string,
  columns: TableColumnProperties[],
  rows: (string | number | Date)[][]
) => {
  worksheet.addTable({
    name: tableName,
    ref,
    headerRow: true,
    style: {
      theme: "TableStyleMedium2",
      showRowStripes: true,
      showColumnStripes: false,
    },
    columns,
    rows,
  });

  autoFitColumns(worksheet);
};

const getLatestReportsByUser = (reports: SnapshotReportRecord[]) => {
  const latestReportByUser = new Map<number, SnapshotReportRecord>();

  reports.forEach((report) => {
    const current = latestReportByUser.get(report.userId);

    if (!current || report.occurredAt.getTime() > current.occurredAt.getTime()) {
      latestReportByUser.set(report.userId, report);
    }
  });

  return latestReportByUser;
};

const getTableRef = (rowNumber: number) => `A${rowNumber}`;

const getDailyReports = async (db: PrismaClient, date: Date) =>
  db.locationReport.findMany({
    where: {
      occurredAt: {
        gte: moment(date).startOf("day").toDate(),
        lte: moment(date).endOf("day").toDate(),
      },
    },
    include: {
      user: {
        select: {
          fullName: true,
          phone: true,
        },
      },
      location: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: [
      { occurredAt: "desc" },
      { id: "desc" },
    ],
  });

export const createDateSnapshotSheet = async (
  worksheet: Worksheet,
  db: PrismaClient,
  date: Date
) => {
  const startOfDay = moment(date).startOf("day").toDate();
  const endOfDay = moment(date).endOf("day").toDate();

  const [users, reports] = await Promise.all([
    db.user.findMany({
      orderBy: {
        fullName: "asc",
      },
    }),
    db.locationReport.findMany({
      where: {
        occurredAt: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      include: {
        user: {
          select: {
            fullName: true,
            phone: true,
          },
        },
        location: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: [
        { occurredAt: "desc" },
        { id: "desc" },
      ],
    }),
  ]);

  const latestReportByUser = getLatestReportsByUser(reports);
  const rows = users
    .slice()
    .sort(sortByName)
    .map((user) => {
      const latestReport = latestReportByUser.get(user.id);

      return [
        user.fullName,
        latestReport?.location.name || MISSING_LOCATION_LABEL,
        formatStatus(latestReport?.isStatusOk),
        formatNotes(latestReport?.notes),
        user.phone || "-",
        formatTimestamp(latestReport?.occurredAt),
      ];
    });

  worksheet.getCell("A1").value = `מצב יומי לתאריך ${moment(date).format("DD-MM-YYYY")}`;

  addWorksheetTable(
    worksheet,
    "DateSnapshotTable",
    getTableRef(2),
    [
      { name: "שם מלא", filterButton: true },
      { name: "מיקום נוכחי", filterButton: true },
      { name: "סטטוס יומי", filterButton: true },
      { name: "הערות", filterButton: true },
      { name: "טלפון", filterButton: true },
      { name: "עודכן אחרונה", filterButton: true },
    ],
    rows
  );

  worksheet.views = [{ rightToLeft: true }];

  return rows.length + 3;
};

export const createTransitionsSheet = async (
  worksheet: Worksheet,
  db: PrismaClient,
  date: Date,
  startRow = 1
) => {
  const reports = await getDailyReports(db, date);

  const latestDailyReportIds = new Set(
    Array.from(
      getLatestReportsByUser(reports).values(),
      (report) => report.id
    )
  );

  const rows = reports
    // .filter((report) => !latestDailyReportIds.has(report.id)) 
    .map((report) => [
      report.user.fullName,
      report.location.name,
      formatStatus(report.isStatusOk),
      formatNotes(report.notes),
      formatTimestamp(report.occurredAt),
      formatTimestamp(report.createdAt),
      report.source,
      report.user.phone || "-",
    ]);

  const visibleRows =
    rows.length > 0
      ? rows
      : [["אין דיווחים קודמים לאותו יום", "-", "-", "-", "-", "-", "-", "-"]];

  worksheet.getCell(`A${startRow}`).value = "דיווחים קודמים מאותו יום";

  addWorksheetTable(
    worksheet,
    "TransitionsTable",
    getTableRef(startRow + 1),
    [
      { name: "שם מלא", filterButton: true },
      { name: "מיקום", filterButton: true },
      { name: "סטטוס", filterButton: true },
      { name: "הערות", filterButton: true },
      { name: "זמן דיווח", filterButton: true },
      { name: "נוצר במערכת", filterButton: true },
      { name: "מקור", filterButton: true },
      { name: "טלפון", filterButton: true },
    ],
    visibleRows
  );

  worksheet.views = [{ rightToLeft: true }];
};

export const createExcelArchive = async (db: PrismaClient, date: Date) => {
  const workbook = new Workbook();
  const snapshotSheet = workbook.addWorksheet("מצב יומי");
  const transitionsSheet = workbook.addWorksheet('דיווחים');

  await createDateSnapshotSheet(snapshotSheet, db, date);
  await createTransitionsSheet(transitionsSheet, db, date);

  return workbook;
};

const createReportsWorkbook = async (
  db: PrismaClient,
  params: SearchQueryOptions
) => {
  const where: {
    userId?: number;
    locationId?: number;
    isStatusOk?: boolean | null;
    occurredAt?: {
      gte: Date;
      lt: Date;
    };
  } = {};

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
    const minDate = moment(params.minDate ?? baseDate).startOf("day").toDate();
    const maxDate = moment(params.maxDate ?? baseDate).startOf("day").add(1, "day").toDate();

    where.occurredAt = {
      gte: minDate,
      lt: maxDate,
    };
  }

  const reports = await db.locationReport.findMany({
    where,
    include: {
      user: {
        select: {
          fullName: true,
        },
      },
      location: {
        select: {
          name: true,
        },
      },
    },
    orderBy: [
      { occurredAt: "desc" },
      { id: "desc" },
    ],
  });

  if (reports.length === 0) {
    throw new NoContentError("אין דוחות להצגה");
  }

  const workbook = new Workbook();
  const worksheet = workbook.addWorksheet("דיווח");

  addWorksheetTable(
    worksheet,
    "ReportsTable",
    getTableRef(1),
    [
      { name: "שם משתמש", filterButton: true },
      { name: "מיקום", filterButton: true },
      { name: "תאריך", filterButton: true },
      { name: "שעה", filterButton: true },
      { name: "סטטוס", filterButton: true },
      { name: "הערות", filterButton: true },
      { name: "מקור", filterButton: true },
    ],
    reports.map((report) => [
      report.user.fullName,
      report.location.name,
      report.occurredAt.toLocaleDateString("he-IL", { timeZone: JERUSALEM_TIMEZONE }),
      report.occurredAt.toLocaleTimeString("he-IL", { timeZone: JERUSALEM_TIMEZONE }),
      formatStatus(report.isStatusOk),
      formatNotes(report.notes),
      report.source,
    ])
  );

  worksheet.views = [{ rightToLeft: true }];

  return workbook;
};

export const createExcelExportWorkbook = async (
  db: PrismaClient,
  params: SearchQueryOptions
) => {
  const singleUtcRangeDate =
    params.minDate &&
    params.maxDate &&
    moment.utc(params.minDate).format("YYYY-MM-DD") ===
      moment.utc(params.maxDate).format("YYYY-MM-DD")
      ? moment.utc(params.minDate).toDate()
      : null;

  const singleDate =
    params.date ??
    singleUtcRangeDate;

  if (singleDate) {
    return createExcelArchive(db, singleDate);
  }

  return createReportsWorkbook(db, params);
};
