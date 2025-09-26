CREATE TABLE IF NOT EXISTS `user_data` (
	`user_id` text PRIMARY KEY NOT NULL,
	`lang` text,
	`theme` text,
	`favorites_json` text,
	`sprite_pref` text,
	`updated_at` integer DEFAULT (strftime('%s','now')) NOT NULL
);

