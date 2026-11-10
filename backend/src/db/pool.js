import 'dotenv/config';
import pg from 'pg';

const { Pool } = pg;

const required = ['DB_HOST', 'DB_PORT', 'DB_NAME', 'DB_USER'];
const missing = required.filter((key) => !process.env[key]);
if (missing.length) {
  throw new Error(`Missing database configuration: ${missing.join(', ')}`);
}

export const databaseUrl = process.env.DATABASE_URL || [
  `postgresql://${encodeURIComponent(process.env.DB_USER)}`,
  process.env.DB_PASSWORD ? `:${encodeURIComponent(process.env.DB_PASSWORD)}` : '',
  `@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`
].join('');

if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = databaseUrl;
}

export const pool = new Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: String(process.env.DB_PASSWORD ?? ''),
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000
});

export function ensureDatabasePassword() {
  if (!process.env.DB_PASSWORD) {
    throw new Error('DB_PASSWORD is empty; fill it in backend/.env before connecting to PostgreSQL');
  }
}

export async function checkDatabase() {
  ensureDatabasePassword();
  const result = await pool.query('SELECT current_database() AS database, NOW() AS server_time');
  return result.rows[0];
}
