import { type DrizzleD1Database, drizzle } from "drizzle-orm/d1";
import * as authSchema from "./schema/auth";
import * as auditSchema from "./schema/audit";
import * as uncertaintySchema from "./schema/uncertainty";

const schema = { ...authSchema, ...auditSchema, ...uncertaintySchema };

export type Database = DrizzleD1Database<typeof schema>;

const dbCache = new WeakMap<D1Database, Database>();

export function createDb(d1: D1Database): Database {
  const cached = dbCache.get(d1);
  if (cached) return cached;

  const db = drizzle(d1, { schema });
  dbCache.set(d1, db);
  return db;
}
