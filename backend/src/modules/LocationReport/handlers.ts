import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";

import moment from "moment";
import * as fs from "fs";
import * as path from "path";

import { LocationReportDal } from "./dal";
import { BackupService } from "../../services/backup";
import { getBackupDir } from "../../services/backupPath";

import { entityWithIdValidator } from "../../utils/validations";

import {
  partialLocationReportValidator,
  plainLocationReportValidator,
  searchQueryOptionsValidator,
} from "./types";

const BACKUP_DIR = getBackupDir();
const BACKUP_FILE_PATTERN = /^(\d{2})-(\d{2})-(\d{4})\.xlsx$/;

type BackupListItem = {
  fileName: string;
  date: string;
  isToday: boolean;
  lastUpdatedAt: string;
};

/**
 * BACKUP HANDLERS
 */
export const manualBackupHandler =
  (backupService: BackupService) => async (_req: Request, res: Response) => {
    await backupService.runBackup();
    res.status(StatusCodes.OK).json({
      success: true,
      message: "Backup created",
    });
  };

export const getBackupListHandler = 
  () => async (_req: Request, res: Response) => {
    if (!fs.existsSync(BACKUP_DIR)) {
      res.status(StatusCodes.OK).json([]);
      return;
    }

    const files = fs
      .readdirSync(BACKUP_DIR)
      .filter((f) => f.endsWith(".xlsx"))
      .map<BackupListItem | null>((fileName) => {
        const match = fileName.match(BACKUP_FILE_PATTERN);

        if (!match) {
          return null;
        }

        const [, day, month, year] = match;
        const filePath = path.join(BACKUP_DIR, fileName);
        const stats = fs.statSync(filePath);
        const date = `${year}-${month}-${day}`;

        return {
          fileName,
          date,
          isToday: date === moment().format("YYYY-MM-DD"),
          lastUpdatedAt: stats.mtime.toISOString(),
        };
      })
      .filter((file): file is BackupListItem => file !== null)
      .sort((left, right) => right.date.localeCompare(left.date));

    res.status(StatusCodes.OK).json(files);
  };

export const downloadBackupHandler = 
  () => async (req: Request, res: Response) => {
    const fileName = req.params.file;

    if (!fileName || fileName.includes("/") || fileName.includes("..")) {
      res.status(StatusCodes.BAD_REQUEST).json({ error: "Invalid filename" });
      return;
    }

    const filePath = path.join(BACKUP_DIR, fileName.toString());

    if (!fs.existsSync(filePath)) {
      res.status(StatusCodes.NOT_FOUND).json({ error: "File not found" });
      return;
    }

    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    res.download(filePath);
  };

/**
 * EXPORT HANDLER (Using the DAL method from the 'dev' branch)
 */
export const exportReportsHandler =
  (dal: LocationReportDal) => async (req: Request, res: Response) => {
    const params = Object.keys(req.query).length > 0 ? searchQueryOptionsValidator(req.query) : null;
    
    // This is the important part: Use the DAL method the team created
    const workBook = await dal.createExcelExport(params ?? {});

    const minDate = moment(params?.minDate).format('DD-MM-YYYY');
    const maxDate = moment(params?.maxDate).format('DD-MM-YYYY');

    const date = moment(params?.date).format('DD-MM-YYYY');
    
    const dateString = params?.date ? date : `${minDate + " - " + maxDate}`;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=' + `${dateString}.xlsx`);
    res.status(StatusCodes.OK);

    await workBook.xlsx.write(res);
    res.end();
  };

/**
 * STANDARD REPORT HANDLERS
 */
export const getReportsHandler =
  (dal: LocationReportDal) => async (req: Request, res: Response) => {
    const params = searchQueryOptionsValidator(req.query);
    const reports = await dal.getAllReports(params);
    res.status(StatusCodes.OK).json(reports);
  };

export const getReportByIdHandler =
  (dal: LocationReportDal) => async (req: Request, res: Response) => {
    const { id } = entityWithIdValidator(req.params);
    const report = await dal.getReportById(id);
    res.status(StatusCodes.OK).json(report);
  };

export const addReportHandler =
  (dal: LocationReportDal) => async (req: Request, res: Response) => {
    const data = plainLocationReportValidator(req.body);
    const report = await dal.addReport(data);
    res.status(StatusCodes.CREATED).json(report);
  };

export const updateReportHandler =
  (dal: LocationReportDal) => async (req: Request, res: Response) => {
    const { id } = entityWithIdValidator(req.params);
    const data = partialLocationReportValidator(req.body);

    const report = await dal.updateReport(id, data);

    res.status(StatusCodes.OK).json(report);
  };

export const deleteReportHandler =
  (dal: LocationReportDal) => async (req: Request, res: Response) => {
    const { id } = entityWithIdValidator(req.params);

    await dal.deleteReport(id);

    res.sendStatus(StatusCodes.NO_CONTENT);
  };
