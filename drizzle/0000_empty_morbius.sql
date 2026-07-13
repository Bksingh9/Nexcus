CREATE TABLE `audit_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`action` text NOT NULL,
	`actor` text DEFAULT 'system' NOT NULL,
	`detail` text DEFAULT '' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `integration_events` (
	`id` text PRIMARY KEY NOT NULL,
	`integration` text NOT NULL,
	`event_type` text NOT NULL,
	`status` text DEFAULT 'prepared' NOT NULL,
	`payload_json` text DEFAULT '{}' NOT NULL,
	`response_id` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `respondents` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text DEFAULT '' NOT NULL,
	`name` text DEFAULT 'Anonymous' NOT NULL,
	`attributes_json` text DEFAULT '{}' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `responses` (
	`id` text PRIMARY KEY NOT NULL,
	`survey_id` text NOT NULL,
	`respondent_id` text NOT NULL,
	`status` text DEFAULT 'completed' NOT NULL,
	`score` integer,
	`answers_json` text DEFAULT '{}' NOT NULL,
	`hidden_fields_json` text DEFAULT '{}' NOT NULL,
	`tags_json` text DEFAULT '[]' NOT NULL,
	`source` text DEFAULT 'api' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`survey_id`) REFERENCES `surveys`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`respondent_id`) REFERENCES `respondents`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `sdk_events` (
	`id` text PRIMARY KEY NOT NULL,
	`event_type` text NOT NULL,
	`environment_id` text DEFAULT '' NOT NULL,
	`user_id` text DEFAULT '' NOT NULL,
	`payload_json` text DEFAULT '{}' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `surveys` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`channel` text DEFAULT 'link' NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`audience` text DEFAULT 'All users' NOT NULL,
	`trigger` text DEFAULT 'Manual link share' NOT NULL,
	`completion` text DEFAULT 'Thanks for the feedback.' NOT NULL,
	`questions_json` text DEFAULT '[]' NOT NULL,
	`hidden_fields_json` text DEFAULT '{}' NOT NULL,
	`styling_json` text DEFAULT '{}' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `surveys_slug_unique` ON `surveys` (`slug`);