CREATE TABLE `sync_receipts` (
	`operation_id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`payload_hash` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_sync_receipts_owner` ON `sync_receipts` (`owner`);