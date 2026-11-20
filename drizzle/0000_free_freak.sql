CREATE TABLE `movements` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`description` text NOT NULL,
	`amount` integer NOT NULL,
	`kind` text NOT NULL,
	`category` text NOT NULL,
	`date` text NOT NULL,
	`account` text NOT NULL,
	`source` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_movements_owner_date` ON `movements` (`owner`,`date`);--> statement-breakpoint
CREATE TABLE `preferences` (
	`owner` text PRIMARY KEY NOT NULL,
	`data` text NOT NULL
);
