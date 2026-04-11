CREATE TABLE `ctrl_preferences` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`dashboard` text DEFAULT '{}' NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_ctrl_preferences_user` ON `ctrl_preferences` (`user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `uq_ctrl_preferences_user` ON `ctrl_preferences` (`user_id`);