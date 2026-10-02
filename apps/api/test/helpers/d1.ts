import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { DatabaseSync, type SQLInputValue } from "node:sqlite";

// A D1Database over node:sqlite with the migrations applied, so unit tests run
// the real SQL. Only the calls platform uses are implemented. See .cf-future.
const MIGRATIONS_DIR = join(import.meta.dirname, "../../migrations");

class Statement {
  private params: SQLInputValue[] = [];
  constructor(
    private db: DatabaseSync,
    private sql: string,
  ) {}
  bind(...params: SQLInputValue[]): Statement {
    this.params = params;
    return this;
  }
  async first<T>(): Promise<T | null> {
    const row = this.db.prepare(this.sql).get(...this.params);
    return (row ?? null) as T | null;
  }
  async all<T>(): Promise<{ results: T[] }> {
    return { results: this.db.prepare(this.sql).all(...this.params) as T[] };
  }
  async run(): Promise<{ success: true }> {
    this.db.prepare(this.sql).run(...this.params);
    return { success: true };
  }
}

export function createTestD1(): D1Database {
  const db = new DatabaseSync(":memory:");
  for (const file of readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort()) {
    db.exec(readFileSync(join(MIGRATIONS_DIR, file), "utf8"));
  }
  const d1 = { prepare: (sql: string) => new Statement(db, sql) };
  return d1 as unknown as D1Database;
}
