-- Migration number: 0002 	 2026-04-11T12:10:35.048Z
CREATE TABLE `ctrl_notification` (
	`id` TEXT PRIMARY KEY NOT NULL,
	`user_id` TEXT NOT NULL,
	`surface` TEXT NOT NULL,
	`type` TEXT NOT NULL,
	`title` TEXT NOT NULL,
	`detail` TEXT,
	`url` TEXT,
	`is_read` INTEGER NOT NULL DEFAULT 0,
	`created_at` INTEGER NOT NULL
);

CREATE INDEX `idx_ctrl_notification_user_surface_read` ON `ctrl_notification` (`user_id`, `surface`, `is_read`);
CREATE INDEX `idx_ctrl_notification_created` ON `ctrl_notification` (`created_at`);

CREATE TABLE `ctrl_property` (
	`id` TEXT PRIMARY KEY NOT NULL,
	`name` TEXT NOT NULL UNIQUE,
	`domain` TEXT NOT NULL UNIQUE,
	`repo_owner` TEXT NOT NULL,
	`repo_name` TEXT NOT NULL,
	`content_path` TEXT,
	`email_domain` TEXT,
	`created_at` INTEGER NOT NULL,
	`updated_at` INTEGER NOT NULL
);

INSERT INTO `ctrl_property` (`id`, `name`, `domain`, `repo_owner`, `repo_name`, `content_path`, `email_domain`, `created_at`, `updated_at`) VALUES
	('019d7c74-0000-7000-8000-000000000001', 'sean.silvius.me', 'sean.silvius.me', 'ssilvius', 'shingle', 'src/content', NULL, cast(unixepoch('subsecond') * 1000 as integer), cast(unixepoch('subsecond') * 1000 as integer)),
	('019d7c74-0000-7000-8000-000000000002', 'rafters.studio', 'rafters.studio', 'rafters-studio', 'platform', NULL, NULL, cast(unixepoch('subsecond') * 1000 as integer), cast(unixepoch('subsecond') * 1000 as integer)),
	('019d7c74-0000-7000-8000-000000000003', 'gitpress.app', 'gitpress.app', 'rafters-studio', 'gitpress', NULL, NULL, cast(unixepoch('subsecond') * 1000 as integer), cast(unixepoch('subsecond') * 1000 as integer)),
	('019d7c74-0000-7000-8000-000000000004', 'huttspawn.com', 'huttspawn.com', 'ssilvius', 'huttspawn', 'src/content', NULL, cast(unixepoch('subsecond') * 1000 as integer), cast(unixepoch('subsecond') * 1000 as integer)),
	('019d7c74-0000-7000-8000-000000000005', 'ezmode.games', 'ezmode.games', 'ezmode-games', 'platform', NULL, NULL, cast(unixepoch('subsecond') * 1000 as integer), cast(unixepoch('subsecond') * 1000 as integer));
