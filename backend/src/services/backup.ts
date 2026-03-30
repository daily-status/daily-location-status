import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";
import moment from "moment";
import logger from "../utils/logger";
import { getBackupDir } from "./backupPath";
import { createExcelExportWorkbook } from "../modules/LocationReport/excel";

export class BackupService {
  private interval?: NodeJS.Timeout;
  private readonly backupDir = getBackupDir();
  private readonly intervalMs = 36000000;
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

      const workbook = await createExcelExportWorkbook(this.prisma, { date: now });
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
