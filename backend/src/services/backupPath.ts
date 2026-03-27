import * as path from "path";

const DEFAULT_DOCKER_BACKUP_DIR = "/app/backups";

export const getBackupDir = () => {
  if (process.env.BACKUP_DIR) {
    return path.resolve(process.env.BACKUP_DIR);
  }

  if (process.cwd() === "/app") {
    return DEFAULT_DOCKER_BACKUP_DIR;
  }

  return path.resolve(process.cwd(), "../backups");
};
