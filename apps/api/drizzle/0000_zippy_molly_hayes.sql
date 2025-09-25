CREATE TABLE `favorites` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`pokemon_id` integer NOT NULL,
	`nickname` text,
	`created_at` integer DEFAULT (strftime('%s','now')) NOT NULL
);
