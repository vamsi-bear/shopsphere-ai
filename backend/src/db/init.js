import 'dotenv/config';
import { ensureDatabasePassword, pool } from './pool.js';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const sqlPath = path.join(path.dirname(fileURLToPath(import.meta.url)), '../../sql/001_init.sql');
try {
  ensureDatabasePassword();
  await pool.query(await readFile(sqlPath, 'utf8'));
  console.log('ShopSphere PostgreSQL schema initialized.');
} finally {
  await pool.end();
}
