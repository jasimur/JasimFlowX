CREATE TABLE `bin_sessions` (
	`token_hash` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`expires_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_bin_sessions_owner` ON `bin_sessions` (`owner`);--> statement-breakpoint
CREATE TABLE `entries` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`kind` text NOT NULL,
	`amount` integer NOT NULL,
	`category` text NOT NULL,
	`account` text NOT NULL,
	`to_account` text DEFAULT '' NOT NULL,
	`person` text DEFAULT '' NOT NULL,
	`parent_id` text,
	`date` text NOT NULL,
	`due_date` text DEFAULT '' NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`channel` text DEFAULT '' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`delete_group` text
);
--> statement-breakpoint
CREATE INDEX `idx_entries_owner_deleted_date` ON `entries` (`owner`,`deleted_at`,`date`);--> statement-breakpoint
CREATE INDEX `idx_entries_owner_parent` ON `entries` (`owner`,`parent_id`);--> statement-breakpoint
CREATE TABLE `preferences` (
	`owner` text PRIMARY KEY NOT NULL,
	`data` text DEFAULT '{}' NOT NULL,
	`bin_hash` text,
	`bin_salt` text,
	`failures` integer DEFAULT 0 NOT NULL,
	`locked_until` integer DEFAULT 0 NOT NULL
);
