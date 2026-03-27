import "dotenv/config";
import { execFileSync } from "child_process";
import mariadb from "mariadb";
import {
  RAW_TEST_DATABASE_URL,
  testDbName,
} from "./src/services/__tests__/database";

export default async () => {
  const testDatabaseUrl = new URL(RAW_TEST_DATABASE_URL);
  const client = await mariadb.createConnection({
    host: testDatabaseUrl.hostname,
    port: Number(testDatabaseUrl.port || 3306),
    user: decodeURIComponent(testDatabaseUrl.username),
    password: decodeURIComponent(testDatabaseUrl.password),
    database: "mysql",
  });

  console.log(`Creating test database ${testDbName} if it doesn't exist...`);
  await client.query(`CREATE DATABASE IF NOT EXISTS \`${testDbName}\`;`);
  await client.end();

  execFileSync("npx", ["prisma", "db", "push", "--url", RAW_TEST_DATABASE_URL], {
    cwd: process.cwd(),
    stdio: "inherit",
  });
};
