CREATE TABLE `inbox` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`content` text NOT NULL,
	`sender` text NOT NULL,
	`created_at` text NOT NULL,
	`status` text NOT NULL,
	`fingerprint` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_inbox_owner_fingerprint` ON `inbox` (`owner`,`fingerprint`);