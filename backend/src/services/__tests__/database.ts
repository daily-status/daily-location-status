import "dotenv/config";
import { createSystemConfig } from "../../config";
import { createDBClient, normalizeDatabaseUrl } from "../database";

const testConfig = createSystemConfig(process.env).db;
testConfig.DATABASE_URL = testConfig.DATABASE_URL + '_test';
export const RAW_TEST_DATABASE_URL = testConfig.DATABASE_URL;
export const TEST_DATABASE_URL = normalizeDatabaseUrl(testConfig.DATABASE_URL);
const testDatabaseUrl = new URL(TEST_DATABASE_URL);
export const testDbName = testDatabaseUrl.pathname.replace(/^\//, "");

export const testDBClient  = createDBClient(testConfig);

export const resetTestDatabase = async () => {
  await testDBClient.locationReport.deleteMany();
  await testDBClient.user.deleteMany();
  await testDBClient.location.deleteMany();
};

export const disconnectTestDatabase = async () => {
  await testDBClient.$disconnect();
};
