CREATE TABLE `user_meta` (
	`user_id` text PRIMARY KEY NOT NULL,
	`db_name` text,
	`db_url` text,
	`db_host` text,
	`provisioned_at` integer DEFAULT (strftime('%s','now'))
);
