import { Router } from "express";
import { LocationReportDal } from "./dal";
import * as handlers from "./handlers";
import { httpLogger } from "../../utils/decorators";
import { BackupService } from "../../services/backup";

export const createLocationReportRouter = (
  dal: LocationReportDal,
  backupService: BackupService | null
) => {
  const router = Router();
  const reportHandlers = createDecoratedLocationReportHandlers(dal);

  // Standard & Export Routes
router.get("/", reportHandlers.getReportsHandler);
router.get("/export", reportHandlers.exportReportsHandler);
router.get("/:id", reportHandlers.getReportByIdHandler);
router.post("/", reportHandlers.addReportHandler);
router.put("/:id", reportHandlers.updateReportHandler);
router.delete("/:id", reportHandlers.deleteReportHandler);

  // Backup Routes (Conditional based on backupService)
  if (backupService) {
    const backupHandlers = createDecoratedBackupHandlers(backupService);
    
    router.post("/backup", backupHandlers.manualBackupHandler);
    router.get("/backup/list", backupHandlers.getBackupListHandler);
    router.get("/backup/download/:file", backupHandlers.downloadBackupHandler);
  }

  return router;
};

export const createDecoratedLocationReportHandlers = (
  dal: LocationReportDal
) => ({
  getReportsHandler: httpLogger(
    handlers.getReportsHandler(dal),
    "getReportsHandler"
  ),
  getReportByIdHandler: httpLogger(
    handlers.getReportByIdHandler(dal),
    "getReportByIdHandler"
  ),
  exportReportsHandler: httpLogger(
    handlers.exportReportsHandler(dal),
    "exportReportsHandler"
  ),
  addReportHandler: httpLogger(
    handlers.addReportHandler(dal),
    "addReportHandler"
  ),
  updateReportHandler: httpLogger(
    handlers.updateReportHandler(dal),
    "updateReportHandler"
  ),
  deleteReportHandler: httpLogger(
    handlers.deleteReportHandler(dal),
    "deleteReportHandler"
  ),
});

export const createDecoratedBackupHandlers = (backupService: BackupService) => ({
  manualBackupHandler: httpLogger(
    handlers.manualBackupHandler(backupService),
    "manualBackupHandler"
  ),
  getBackupListHandler: httpLogger(
    handlers.getBackupListHandler(),
    "getBackupListHandler"
  ),
  downloadBackupHandler: httpLogger(
    handlers.downloadBackupHandler(),
    "downloadBackupHandler"
  ),
});
