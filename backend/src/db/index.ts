import { drizzle as drizzleNodePg, NodePgDatabase } from 'drizzle-orm/node-postgres';
import { drizzle as drizzlePglite, PgliteDatabase } from 'drizzle-orm/pglite';
import { PGlite } from '@electric-sql/pglite';
import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { env } from '../config/env.js';
import * as schema from './schema.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export type Database = NodePgDatabase<typeof schema> | PgliteDatabase<typeof schema>;

let dbInstance: Database | null = null;
let rawExecutor: ((sqlText: string) => Promise<void>) | null = null;
let pgliteClient: PGlite | null = null;
let pgPool: pg.Pool | null = null;

export function getDb(): Database {
  if (dbInstance) return dbInstance;

  const dbUrl = process.env.DATABASE_URL || env.databaseUrl;
  if (dbUrl && (dbUrl.startsWith('postgres://') || dbUrl.startsWith('postgresql://'))) {
    pgPool = new pg.Pool({ connectionString: dbUrl });
    dbInstance = drizzleNodePg(pgPool, { schema });
    rawExecutor = async (sqlText: string) => {
      await pgPool!.query(sqlText);
    };
  } else {
    const dataDir =
      process.env.PGLITE_DATA_DIR ||
      path.resolve(__dirname, '../../data/pgdata');

    if (dataDir !== 'memory://') {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    pgliteClient = dataDir === 'memory://' ? new PGlite() : new PGlite(dataDir);
    const pgliteDb = drizzlePglite(pgliteClient, { schema });

    // Serialize transactions on single-connection PGlite so concurrent Promise.all requests
    // cleanly execute one transaction after another without interleaving BEGIN statements.
    const originalTx = pgliteDb.transaction.bind(pgliteDb);
    let txQueue: Promise<unknown> = Promise.resolve();
    (pgliteDb as unknown as { transaction: typeof pgliteDb.transaction }).transaction = ((
      callback: Parameters<typeof pgliteDb.transaction>[0],
      config?: Parameters<typeof pgliteDb.transaction>[1]
    ) => {
      const next = txQueue.then(
        () => originalTx(callback, config),
        () => originalTx(callback, config)
      );
      txQueue = next.catch(() => undefined);
      return next;
    }) as typeof pgliteDb.transaction;

    dbInstance = pgliteDb;
    rawExecutor = async (sqlText: string) => {
      await pgliteClient!.exec(sqlText);
    };
  }

  return dbInstance;
}

export async function executeRawSql(sqlText: string): Promise<void> {
  getDb();
  if (!rawExecutor) throw new Error('Database executor not initialized');
  await rawExecutor(sqlText);
}

export async function closeDb(): Promise<void> {
  if (pgliteClient) {
    await pgliteClient.close();
    pgliteClient = null;
  }
  if (pgPool) {
    await pgPool.end();
    pgPool = null;
  }
  dbInstance = null;
  rawExecutor = null;
}

export const db = new Proxy({} as NodePgDatabase<typeof schema>, {
  get(_target, prop) {
    const instance = getDb() as unknown as Record<string | symbol, unknown>;
    const val = instance[prop];
    return typeof val === 'function' ? val.bind(instance) : val;
  },
});
