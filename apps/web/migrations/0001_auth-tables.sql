-- Migration number: 0001 	 2026-03-19T07:56:11.466Z
-- better-auth v1.5.5 core tables for D1 (SQLite)
-- Column names are snake_case, dates stored as TEXT (ISO datetime)

CREATE TABLE IF NOT EXISTS "user" (
	"id" TEXT PRIMARY KEY NOT NULL,
	"created_at" TEXT NOT NULL DEFAULT (datetime('now')),
	"updated_at" TEXT NOT NULL DEFAULT (datetime('now')),
	"email" TEXT NOT NULL UNIQUE,
	"email_verified" INTEGER NOT NULL DEFAULT 0,
	"name" TEXT NOT NULL,
	"image" TEXT
);

CREATE TABLE IF NOT EXISTS "session" (
	"id" TEXT PRIMARY KEY NOT NULL,
	"created_at" TEXT NOT NULL DEFAULT (datetime('now')),
	"updated_at" TEXT NOT NULL DEFAULT (datetime('now')),
	"user_id" TEXT NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
	"expires_at" TEXT NOT NULL,
	"token" TEXT NOT NULL UNIQUE,
	"ip_address" TEXT,
	"user_agent" TEXT
);

CREATE TABLE IF NOT EXISTS "account" (
	"id" TEXT PRIMARY KEY NOT NULL,
	"created_at" TEXT NOT NULL DEFAULT (datetime('now')),
	"updated_at" TEXT NOT NULL DEFAULT (datetime('now')),
	"provider_id" TEXT NOT NULL,
	"account_id" TEXT NOT NULL,
	"user_id" TEXT NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
	"access_token" TEXT,
	"refresh_token" TEXT,
	"id_token" TEXT,
	"access_token_expires_at" TEXT,
	"refresh_token_expires_at" TEXT,
	"scope" TEXT,
	"password" TEXT
);

CREATE TABLE IF NOT EXISTS "verification" (
	"id" TEXT PRIMARY KEY NOT NULL,
	"created_at" TEXT NOT NULL DEFAULT (datetime('now')),
	"updated_at" TEXT NOT NULL DEFAULT (datetime('now')),
	"value" TEXT NOT NULL,
	"expires_at" TEXT NOT NULL,
	"identifier" TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_session_user_id" ON "session"("user_id");
CREATE INDEX IF NOT EXISTS "idx_session_token" ON "session"("token");
CREATE INDEX IF NOT EXISTS "idx_account_user_id" ON "account"("user_id");
CREATE INDEX IF NOT EXISTS "idx_account_provider" ON "account"("provider_id", "account_id");
CREATE INDEX IF NOT EXISTS "idx_verification_identifier" ON "verification"("identifier");
