CREATE TABLE `booking_seats` (
	`id` varchar(36) NOT NULL DEFAULT (uuid()),
	`booking_id` varchar(36) NOT NULL,
	`showtime_id` varchar(36) NOT NULL,
	`seat_id` varchar(36) NOT NULL,
	`price` decimal(10,2) NOT NULL,
	`status` enum('reserved','booked','cancelled') NOT NULL DEFAULT 'reserved',
	`created_at` datetime NOT NULL DEFAULT '2025-08-26 17:28:41.676',
	CONSTRAINT `booking_seats_id` PRIMARY KEY(`id`),
	CONSTRAINT `uq_seat_per_showtime` UNIQUE(`showtime_id`,`seat_id`)
);
--> statement-breakpoint
CREATE TABLE `bookings` (
	`id` varchar(36) NOT NULL DEFAULT (uuid()),
	`user_id` varchar(36) NOT NULL,
	`showtime_id` varchar(36) NOT NULL,
	`booking_number` varchar(20) NOT NULL,
	`total_amount` decimal(10,2) NOT NULL,
	`total_seats` int NOT NULL,
	`status` enum('pending','confirmed','cancelled','expired') NOT NULL DEFAULT 'pending',
	`payment_status` enum('pending','paid','failed','refunded') NOT NULL DEFAULT 'pending',
	`payment_method` varchar(50),
	`customer_name` varchar(100) NOT NULL,
	`customer_email` varchar(255) NOT NULL,
	`customer_phone` varchar(20),
	`notes` text,
	`expires_at` datetime,
	`confirmed_at` datetime,
	`cancelled_at` datetime,
	`created_at` datetime NOT NULL DEFAULT '2025-08-26 17:28:41.676',
	`updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `bookings_id` PRIMARY KEY(`id`),
	CONSTRAINT `bookings_booking_number_unique` UNIQUE(`booking_number`)
);
--> statement-breakpoint
CREATE TABLE `payments` (
	`id` varchar(36) NOT NULL DEFAULT (uuid()),
	`booking_id` varchar(36) NOT NULL,
	`amount` decimal(10,2) NOT NULL,
	`method` varchar(50) NOT NULL,
	`status` enum('pending','processing','completed','failed','refunded') NOT NULL DEFAULT 'pending',
	`transaction_id` varchar(100),
	`gateway_response` text,
	`processed_at` datetime,
	`failed_reason` text,
	`created_at` datetime NOT NULL DEFAULT '2025-08-26 17:28:41.676',
	`updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `payments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `cinemas` MODIFY COLUMN `created_at` datetime NOT NULL DEFAULT '2025-08-26 17:28:41.675';--> statement-breakpoint
ALTER TABLE `movies` MODIFY COLUMN `created_at` datetime NOT NULL DEFAULT '2025-08-26 17:28:41.675';--> statement-breakpoint
ALTER TABLE `seats` MODIFY COLUMN `created_at` datetime NOT NULL DEFAULT '2025-08-26 17:28:41.676';--> statement-breakpoint
ALTER TABLE `showtimes` MODIFY COLUMN `created_at` datetime NOT NULL DEFAULT '2025-08-26 17:28:41.676';--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `created_at` datetime NOT NULL DEFAULT '2025-08-26 17:28:41.674';--> statement-breakpoint
CREATE INDEX `idx_bookingSeat_booking` ON `booking_seats` (`booking_id`);--> statement-breakpoint
CREATE INDEX `idx_bookingSeat_seat` ON `booking_seats` (`seat_id`);