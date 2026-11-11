import 'dotenv/config';
import { execFileSync } from 'node:child_process';
import { pool } from './pool.js';

const initialMigration = '20261110170000_initial_schema';
function runPrisma(args) {
  if (process.platform === 'win32') {
    execFileSync(process.env.ComSpec || 'cmd.exe', ['/d', '/s', '/c', `npx prisma ${args.join(' ')}`], { stdio: 'inherit' });
    return;
  }
  execFileSync('npx', ['prisma', ...args], { stdio: 'inherit' });
}

async function migrationRecord() {
  try {
    const result = await pool.query(
      'SELECT finished_at, rolled_back_at FROM "_prisma_migrations" WHERE migration_name = $1 ORDER BY started_at DESC LIMIT 1',
      [initialMigration]
    );
    return result.rows[0] || null;
  } catch (error) {
    if (error.code === '42P01') return null;
    throw error;
  }
}

const record = await migrationRecord();
const needsBaseline = !record || (!record.finished_at && !record.rolled_back_at);

if (record && !record.finished_at && !record.rolled_back_at) {
  runPrisma(['migrate', 'resolve', '--rolled-back', initialMigration]);
}

if (needsBaseline) {
  execFileSync(process.execPath, ['src/db/init.js'], { stdio: 'inherit' });
  runPrisma(['migrate', 'resolve', '--applied', initialMigration]);
}

runPrisma(['migrate', 'deploy']);
await pool.end();
