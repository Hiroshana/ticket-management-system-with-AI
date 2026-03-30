import { Client } from "pg";

const dbUrl = new URL(process.env.DATABASE_URL!);
const dbName = dbUrl.pathname.slice(1); // strip leading /

// Connect to the default "postgres" database to run CREATE DATABASE
const client = new Client({
  host: dbUrl.hostname,
  port: Number(dbUrl.port) || 5432,
  user: dbUrl.username,
  password: decodeURIComponent(dbUrl.password),
  database: "postgres",
});

await client.connect();

const { rowCount } = await client.query(
  "SELECT 1 FROM pg_database WHERE datname = $1",
  [dbName]
);

if (rowCount === 0) {
  await client.query(`CREATE DATABASE "${dbName}"`);
  console.log(`Created database: ${dbName}`);
} else {
  console.log(`Database already exists: ${dbName}`);
}

await client.end();
