-- Migration number: 0001 	 2026-04-11T12:03:33.133Z
CREATE TABLE `ctrl_preferences` (
	`id` TEXT PRIMARY KEY NOT NULL,
	`user_id` TEXT NOT NULL,
	`dashboard` TEXT NOT NULL DEFAULT '{}',
	`created_at` INTEGER NOT NULL,
	`updated_at` INTEGER NOT NULL
);

CREATE INDEX `idx_ctrl_preferences_user` ON `ctrl_preferences` (`user_id`);
