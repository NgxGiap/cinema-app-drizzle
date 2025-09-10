CREATE TABLE `show_times` (
	`id` varchar(36) NOT NULL DEFAULT (uuid()),
	`movie_id` varchar(36) NOT NULL,
	`cinema_id` varchar(36) NOT NULL,
	`show_date` datetime NOT NULL,
	`show_time` varchar(8) NOT NULL,
	`price` decimal(10,2) NOT NULL,
	`total_seats` int NOT NULL DEFAULT 0,
	`booked_seats` int NOT NULL DEFAULT 0,
	`is_active` boolean NOT NULL DEFAULT true,
	`created_at` datetime NOT NULL DEFAULT '2025-08-26 08:01:00.734',
	CONSTRAINT `show_times_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `cinemas` MODIFY COLUMN `created_at` datetime NOT NULL DEFAULT '2025-08-26 08:01:00.732';--> statement-breakpoint
ALTER TABLE `movies` MODIFY COLUMN `created_at` datetime NOT NULL DEFAULT '2025-08-26 08:01:00.732';--> statement-breakpoint
ALTER TABLE `seats` MODIFY COLUMN `created_at` datetime NOT NULL DEFAULT '2025-08-26 08:01:00.732';--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `created_at` datetime NOT NULL DEFAULT '2025-08-26 08:01:00.731';