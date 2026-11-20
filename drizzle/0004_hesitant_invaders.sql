CREATE TABLE `profile_revisions` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`data` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_profile_revisions_owner` ON `profile_revisions` (`owner`,`created_at`);