import { PrismaClient } from "@prisma/client";
import { Workbook } from "exceljs";
import type { Worksheet } from "exceljs";
import * as fs from "fs";
import * as path from "path";
import moment from "moment";
import logger from "../utils/logger";
import { getBackupDir } from "./backupPath";

export class BackupService {
  private interval?: NodeJS.Timeout;
  private readonly backupDir = getBackupDir();
  private readonly intervalMs = 36000000;
  private readonly sheetName = "Snapshot";
  private isRunning = false;

  constructor(private prisma: PrismaClient) {
    this.ensureDir();
  }

  start() {
    logger.info("BackupService started");
    this.runBackup();
    this.interval = setInterval(() => {
      this.runBackup();
    }, this.intervalMs);
  }

  stop() {
    if (this.interval) clearInterval(this.interval);
  }

  async runBackup() {
    if (this.isRunning) {
      logger.info("Backup skipped (already running)");
      return;
    }

    this.isRunning = true;

    try {
      const now = new Date();
      const filePath = this.getFilePath(now);

      const workbook = new Workbook();

      const sheet = this.prepareSheet(workbook, now);

      await this.fillSheet(sheet, now);
      await workbook.xlsx.writeFile(filePath);
      this.cleanOldBackups(30);

      logger.info(`Backup saved: ${filePath}`);

    } catch (err) {
      logger.error("Backup failed", { error: err });
    } finally {
      this.isRunning = false;
    }
  }

  private getFilePath(date: Date): string {
    // Format: DD-MM-YYYY.xlsx — matches client requirement
    const day   = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year  = date.getFullYear();
    return path.join(this.backupDir, `${day}-${month}-${year}.xlsx`);
  }

  private ensureDir() {
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
    }
  }

  private prepareSheet(workbook: Workbook, now: Date): Worksheet {
    const sheet = workbook.addWorksheet(this.sheetName);

    sheet.columns = [
      { header: "User", key: "user" },
      { header: "Location", key: "location" },
      { header: "Status", key: "status" },
      { header: "Time", key: "time" },
    ];

    sheet.getCell("F1").value = "Last Updated";
    sheet.getCell("F2").value = moment(now).format("DD-MM-YYYY HH:mm:ss");

    return sheet;
  }

  private async fillSheet(sheet: Worksheet, snapshotDate: Date) {
    const startOfDay = moment(snapshotDate).startOf("day").toDate();
    const endOfDay = moment(snapshotDate).endOf("day").toDate();

    const reports = await this.prisma.locationReport.findMany({
      where: {
        occurredAt: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      select: {
        occurredAt: true,
        isStatusOk: true,
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
      orderBy: { occurredAt: "asc" },
    });

    logger.info("Backup snapshot data loaded", {
      reportsCount: reports.length,
      snapshotDate: moment(snapshotDate).format("YYYY-MM-DD"),
      startOfDay: startOfDay.toISOString(),
      endOfDay: endOfDay.toISOString(),
    });

    reports.forEach((r) => {
      sheet.addRow({
        user:     r.user.fullName,
        location: r.location.name,
        status:
          r.isStatusOk === true
            ? "תקין"
            : r.isStatusOk === false
              ? "לא תקין"
              : "לא הוזן",
        time: moment(r.occurredAt).format("HH:mm"),
      });
    });

    sheet.getColumn("user").width = 24;
    sheet.getColumn("location").width = 20;
    sheet.getColumn("status").width = 14;
    sheet.getColumn("time").width = 12;
  }

  private cleanOldBackups(days: number) {
    fs.readdirSync(this.backupDir)
      .filter((file) => file.endsWith(".xlsx"))
      .forEach((file) => {
        const filePath = path.join(this.backupDir, file);
        const stats = fs.statSync(filePath);
        const ageDays = moment().diff(moment(stats.mtimeMs), "days");

        if (ageDays > days) {
          fs.unlinkSync(filePath);
          logger.info(`Deleted old backup: ${file}`);
        }
      });
  }
}
