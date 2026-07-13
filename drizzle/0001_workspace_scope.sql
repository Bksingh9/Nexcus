ALTER TABLE `audit_logs` ADD `workspace_id` text DEFAULT 'default-workspace' NOT NULL;
--> statement-breakpoint
ALTER TABLE `integration_events` ADD `workspace_id` text DEFAULT 'default-workspace' NOT NULL;
--> statement-breakpoint
ALTER TABLE `respondents` ADD `workspace_id` text DEFAULT 'default-workspace' NOT NULL;
--> statement-breakpoint
ALTER TABLE `responses` ADD `workspace_id` text DEFAULT 'default-workspace' NOT NULL;
--> statement-breakpoint
ALTER TABLE `sdk_events` ADD `workspace_id` text DEFAULT 'default-workspace' NOT NULL;
--> statement-breakpoint
ALTER TABLE `surveys` ADD `workspace_id` text DEFAULT 'default-workspace' NOT NULL;
