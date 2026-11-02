import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { config } from './config.js';

const { Pool } = pg;

async function migrate() {
  const pool = new Pool({ connectionString: config.databaseUrl });
  const client = await pool.connect();

  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version   INTEGER PRIMARY KEY,
        name      VARCHAR(255) NOT NULL,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    const { rows: applied } = await client.query(
      'SELECT version FROM schema_migrations ORDER BY version'
    );
    const appliedVersions = new Set(applied.map((r: { version: number }) => r.version));

    const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'migrations');
    const files = fs.readdirSync(dir)
      .filter(f => f.endsWith('.sql'))
      .sort();

    let count = 0;
    for (const file of files) {
      const match = file.match(/^(\d+)/);
      if (!match) continue;
      const version = parseInt(match[1], 10);
      if (appliedVersions.has(version)) continue;

      const sql = fs.readFileSync(path.join(dir, file), 'utf-8');
      console.log(`Applying migration ${file}...`);

      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query(
          'INSERT INTO schema_migrations (version, name) VALUES ($1, $2)',
          [version, file]
        );
        await client.query('COMMIT');
        count++;
        console.log(`  Applied ${file}`);
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      }
    }

    if (count === 0) {
      console.log('No new migrations to apply.');
    } else {
      console.log(`Applied ${count} migration(s).`);
    }
  } finally {
    client.release();
    await pool.end();
  }
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
