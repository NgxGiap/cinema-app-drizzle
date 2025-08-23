CREATE TABLE `cinemas` (
	`id` varchar(36) NOT NULL DEFAULT (uuid()),
	`name` varchar(255) NOT NULL,
	`address` text NOT NULL,
	`city` varchar(100) NOT NULL,
	`phone` varchar(20),
	`email` varchar(255),
	`is_active` boolean NOT NULL DEFAULT true,
	`created_at` datetime NOT NULL DEFAULT '2025-08-23 09:21:36.680',
	CONSTRAINT `cinemas_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `seats` (
	`id` varchar(36) NOT NULL DEFAULT (uuid()),
	`cinema_id` varchar(36) NOT NULL,
	`seat_number` varchar(10) NOT NULL,
	`row` varchar(5) NOT NULL,
	`column` int NOT NULL,
	`type` enum('regular','vip','couple','disabled') NOT NULL DEFAULT 'regular',
	`price` decimal(10,2) NOT NULL,
	`is_active` boolean NOT NULL DEFAULT true,
	`created_at` datetime NOT NULL DEFAULT '2025-08-23 09:21:36.681',
	CONSTRAINT `seats_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `movies` MODIFY COLUMN `created_at` datetime NOT NULL DEFAULT '2025-08-23 09:21:36.680';--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `created_at` datetime NOT NULL DEFAULT '2025-08-23 09:21:36.679';