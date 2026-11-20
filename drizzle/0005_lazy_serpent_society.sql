CREATE TABLE `credit_cards` (
	`id` text NOT NULL,
	`owner` text NOT NULL,
	`data` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_credit_cards_owner_id` ON `credit_cards` (`owner`,`id`);--> statement-breakpoint
CREATE TABLE `credit_purchases` (
	`id` text NOT NULL,
	`owner` text NOT NULL,
	`data` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_credit_purchases_owner_id` ON `credit_purchases` (`owner`,`id`);