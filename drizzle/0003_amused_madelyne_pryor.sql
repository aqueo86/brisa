CREATE TABLE `fixed_expenses` (
	`id` text NOT NULL,
	`owner` text NOT NULL,
	`data` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_fixed_owner_id` ON `fixed_expenses` (`owner`,`id`);