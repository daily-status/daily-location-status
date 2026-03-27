import "dotenv/config";
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

  console.log(`Dropping test database ${testDbName}...`);
  await client.query(`DROP DATABASE IF EXISTS \`${testDbName}\`;`);
  await client.end();
};
