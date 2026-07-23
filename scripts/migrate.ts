/**
 * Nihongo Hero — Supabase migration runner.
 *
 *   npm run migrate         apply any pending migrations
 *   npm run migrate:status  list applied / pending without changing anything
 *
 * Connects straight to your Supabase Postgres over DATABASE_URL and applies
 * every file in supabase/migrations/ in filename order, exactly once. Applied
 * migrations are recorded in the `schema_migrations` table, so re-running is
 * safe and idempotent.
 *
 * Why not the supabase-js client? It talks to PostgREST, which cannot execute
 * arbitrary DDL. Migrations need a real Postgres connection.
 *
 * Get DATABASE_URL from: Supabase → Project Settings → Database →
 * Connection string → URI. Prefer the **direct connection** (port 5432); the
 * transaction pooler (6543) doesn't reliably support DDL.
 *
 * A migration file may opt out of transaction wrapping with a marker comment:
 *   -- migrate:no-transaction
 */
import 'dotenv/config';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from 'pg';

const MIGRATIONS_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../supabase/migrations',
);
const NO_TX_MARKER = 'migrate:no-transaction';
const statusOnly = process.argv.includes('--status');

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error(
    [
      'Missing DATABASE_URL in .env',
      '',
      'Supabase → Project Settings → Database → Connection string → URI',
      'Use the direct connection (port 5432) and paste your DB password in.',
      '',
      'Example:',
      '  DATABASE_URL=postgresql://postgres:YOUR-PASSWORD@db.YOUR-REF.supabase.co:5432/postgres',
    ].join('\n'),
  );
  process.exit(1);
}

async function main() {
  const files = (await readdir(MIGRATIONS_DIR)).filter((f) => f.endsWith('.sql')).sort();
  if (files.length === 0) {
    console.log('No migration files found.');
    return;
  }

  const client = new Client({
    connectionString,
    // Supabase requires TLS; its cert chain isn't in Node's default store.
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();

  try {
    await client.query(`
      create table if not exists schema_migrations (
        name text primary key,
        applied_at timestamptz not null default now()
      );
    `);

    const { rows } = await client.query<{ name: string }>('select name from schema_migrations');
    const applied = new Set(rows.map((r) => r.name));
    const pending = files.filter((f) => !applied.has(f));

    if (statusOnly) {
      console.log('\nMigrations:');
      for (const f of files) console.log(`  ${applied.has(f) ? '✓ applied' : '· pending'}  ${f}`);
      console.log(`\n${applied.size} applied, ${pending.length} pending.`);
      return;
    }

    if (pending.length === 0) {
      console.log('✅ Database is up to date — nothing to apply.');
      return;
    }

    console.log(`Applying ${pending.length} migration(s)…\n`);
    for (const file of pending) {
      const sql = await readFile(path.join(MIGRATIONS_DIR, file), 'utf8');
      const useTx = !sql.includes(NO_TX_MARKER);
      process.stdout.write(`  ${file} … `);
      try {
        if (useTx) await client.query('begin');
        await client.query(sql);
        await client.query('insert into schema_migrations (name) values ($1)', [file]);
        if (useTx) await client.query('commit');
        console.log('done');
      } catch (err) {
        if (useTx) await client.query('rollback').catch(() => {});
        console.log('FAILED');
        throw new Error(`${file}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
    console.log('\n✅ Migrations applied. Next: npm run seed');
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error('\n❌ Migration failed:', e.message);
  console.error('\nNothing from the failing migration was committed. Fix the error and re-run.');
  process.exit(1);
});
