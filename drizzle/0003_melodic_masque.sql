CREATE TABLE `movies` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`duration` int NOT NULL,
	`release_date` datetime NOT NULL,
	`created_at` datetime NOT NULL DEFAULT '2025-08-18 15:35:36.928',
	CONSTRAINT `movies_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `created_at` datetime NOT NULL DEFAULT '2025-08-18 15:35:36.927';