-- Migration number: 0002 	 2026-04-28T05:04:33.321Z
CREATE TABLE `uncertainty_prediction` (
	`id` text PRIMARY KEY NOT NULL,
	`surface` text NOT NULL,
	`feature_key` text NOT NULL,
	`input_fingerprint` text NOT NULL,
	`model` text NOT NULL,
	`model_version` text NOT NULL,
	`claimed_confidence` real NOT NULL,
	`prediction_payload` text NOT NULL,
	`state` text NOT NULL,
	`outcome_label` text,
	`outcome_payload` text,
	`outcome_correctness` real,
	`created_at` integer NOT NULL,
	`witnessed_at` integer,
	`orphan_after` integer NOT NULL,
	`cohort_key` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_uncertainty_prediction_cohort` ON `uncertainty_prediction` (`cohort_key`);--> statement-breakpoint
CREATE INDEX `idx_uncertainty_prediction_surface` ON `uncertainty_prediction` (`surface`);--> statement-breakpoint
CREATE INDEX `idx_uncertainty_prediction_state` ON `uncertainty_prediction` (`state`);--> statement-breakpoint
CREATE INDEX `idx_uncertainty_prediction_orphan_sweep` ON `uncertainty_prediction` (`state`, `orphan_after`);--> statement-breakpoint
CREATE TABLE `uncertainty_calibration_snapshot` (
	`id` text PRIMARY KEY NOT NULL,
	`cohort_key` text NOT NULL,
	`bucket_lower` real NOT NULL,
	`bucket_upper` real NOT NULL,
	`claimed_confidence` real NOT NULL,
	`actual_correctness` real NOT NULL,
	`prediction_count` integer NOT NULL,
	`orphan_count` integer NOT NULL,
	`brier_score` real NOT NULL,
	`computed_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_uncertainty_calibration_snapshot_cohort` ON `uncertainty_calibration_snapshot` (`cohort_key`);
