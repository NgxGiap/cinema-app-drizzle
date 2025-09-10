CREATE TABLE `rooms` (
	`id` varchar(36) NOT NULL DEFAULT (uuid()),
	`cinema_id` varchar(36) NOT NULL,
	`name` varchar(100) NOT NULL,
	`capacity` int NOT NULL DEFAULT 0,
	`is_active` boolean NOT NULL DEFAULT true,
	`seating_map` json,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `rooms_id` PRIMARY KEY(`id`),
	CONSTRAINT `uq_room_name_per_cinema` UNIQUE(`cinema_id`,`name`)
);
--> statement-breakpoint
CREATE TABLE `tickets` (
	`id` varchar(36) NOT NULL DEFAULT (uuid()),
	`booking_id` varchar(36) NOT NULL,
	`showtime_id` varchar(36) NOT NULL,
	`seat_id` varchar(36) NOT NULL,
	`status` enum('ISSUED','CHECKED_IN','VOIDED','REFUNDED') NOT NULL DEFAULT 'ISSUED',
	`qr_token` varchar(64) NOT NULL,
	`issued_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`checked_in_at` datetime,
	`checked_in_gate` varchar(50),
	`reissued_from_id` varchar(36),
	`version` int NOT NULL DEFAULT 1,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `tickets_id` PRIMARY KEY(`id`),
	CONSTRAINT `uq_ticket_showtime_seat` UNIQUE(`showtime_id`,`seat_id`),
	CONSTRAINT `uq_ticket_booking_seat_showtime` UNIQUE(`booking_id`,`showtime_id`,`seat_id`),
	CONSTRAINT `uq_ticket_qr` UNIQUE(`qr_token`)
);
--> statement-breakpoint
ALTER TABLE `booking_seats` DROP INDEX `uq_seat_per_showtime`;--> statement-breakpoint
ALTER TABLE `booking_seats` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `booking_seats` MODIFY COLUMN `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE `bookings` MODIFY COLUMN `user_id` varchar(36);--> statement-breakpoint
ALTER TABLE `bookings` MODIFY COLUMN `booking_number` varchar(40) NOT NULL;--> statement-breakpoint
ALTER TABLE `bookings` MODIFY COLUMN `total_amount` decimal(10,2) NOT NULL DEFAULT '0.00';--> statement-breakpoint
ALTER TABLE `bookings` MODIFY COLUMN `status` enum('PENDING','AWAITING_PAYMENT','PAID','CONFIRMED','CANCELLED','EXPIRED','REFUNDED') NOT NULL DEFAULT 'PENDING';--> statement-breakpoint
ALTER TABLE `bookings` MODIFY COLUMN `payment_status` enum('PENDING','PROCESSING','COMPLETED','FAILED','REFUNDED') NOT NULL DEFAULT 'PENDING';--> statement-breakpoint
ALTER TABLE `bookings` MODIFY COLUMN `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE `cinemas` MODIFY COLUMN `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE `movies` MODIFY COLUMN `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE `payments` MODIFY COLUMN `method` varchar(50);--> statement-breakpoint
ALTER TABLE `payments` MODIFY COLUMN `status` enum('PENDING','PROCESSING','COMPLETED','FAILED','REFUNDED') NOT NULL DEFAULT 'PENDING';--> statement-breakpoint
ALTER TABLE `payments` MODIFY COLUMN `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE `seats` MODIFY COLUMN `type` enum('REGULAR','VIP','COUPLE','DISABLED') NOT NULL DEFAULT 'REGULAR';--> statement-breakpoint
ALTER TABLE `seats` MODIFY COLUMN `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE `show_times` MODIFY COLUMN `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `name` varchar(100);--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE `booking_seats` ADD PRIMARY KEY(`showtime_id`,`seat_id`);--> statement-breakpoint
ALTER TABLE `booking_seats` ADD `unit_price` decimal(10,2) NOT NULL;--> statement-breakpoint
ALTER TABLE `bookings` ADD `refunded_at` datetime;--> statement-breakpoint
ALTER TABLE `bookings` ADD `currency` varchar(3) DEFAULT 'USD' NOT NULL;--> statement-breakpoint
ALTER TABLE `bookings` ADD `subtotal_amount` decimal(10,2) DEFAULT '0.00' NOT NULL;--> statement-breakpoint
ALTER TABLE `bookings` ADD `discount_amount` decimal(10,2) DEFAULT '0.00' NOT NULL;--> statement-breakpoint
ALTER TABLE `bookings` ADD `tax_amount` decimal(10,2) DEFAULT '0.00' NOT NULL;--> statement-breakpoint
ALTER TABLE `bookings` ADD `fee_amount` decimal(10,2) DEFAULT '0.00' NOT NULL;--> statement-breakpoint
ALTER TABLE `cinemas` ADD `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL;--> statement-breakpoint
ALTER TABLE `movies` ADD `slug` varchar(220) NOT NULL;--> statement-breakpoint
ALTER TABLE `movies` ADD `runtime_minutes` int NOT NULL;--> statement-breakpoint
ALTER TABLE `movies` ADD `state` enum('COMING_SOON','NOW_SHOWING','ENDED') DEFAULT 'COMING_SOON' NOT NULL;--> statement-breakpoint
ALTER TABLE `movies` ADD `poster_url` varchar(500);--> statement-breakpoint
ALTER TABLE `movies` ADD `trailer_url` varchar(500);--> statement-breakpoint
ALTER TABLE `movies` ADD `genres` json;--> statement-breakpoint
ALTER TABLE `movies` ADD `directors` json;--> statement-breakpoint
ALTER TABLE `movies` ADD `cast` json;--> statement-breakpoint
ALTER TABLE `movies` ADD `rating_code` varchar(10);--> statement-breakpoint
ALTER TABLE `movies` ADD `original_language` varchar(5);--> statement-breakpoint
ALTER TABLE `movies` ADD `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL;--> statement-breakpoint
ALTER TABLE `payments` ADD `currency` varchar(3) DEFAULT 'USD' NOT NULL;--> statement-breakpoint
ALTER TABLE `seats` ADD `room_id` varchar(36) NOT NULL;--> statement-breakpoint
ALTER TABLE `seats` ADD `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL;--> statement-breakpoint
ALTER TABLE `show_times` ADD `room_id` varchar(36) NOT NULL;--> statement-breakpoint
ALTER TABLE `show_times` ADD `starts_at` datetime NOT NULL;--> statement-breakpoint
ALTER TABLE `show_times` ADD `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL;--> statement-breakpoint
ALTER TABLE `movies` ADD CONSTRAINT `movies_slug_unique` UNIQUE(`slug`);--> statement-breakpoint
ALTER TABLE `payments` ADD CONSTRAINT `uq_payment_tx` UNIQUE(`transaction_id`);--> statement-breakpoint
ALTER TABLE `seats` ADD CONSTRAINT `uq_seat_room_number` UNIQUE(`room_id`,`seat_number`);--> statement-breakpoint
ALTER TABLE `show_times` ADD CONSTRAINT `uq_showtime_room_time` UNIQUE(`room_id`,`starts_at`);--> statement-breakpoint
ALTER TABLE `rooms` ADD CONSTRAINT `rooms_cinema_id_cinemas_id_fk` FOREIGN KEY (`cinema_id`) REFERENCES `cinemas`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tickets` ADD CONSTRAINT `tickets_booking_id_bookings_id_fk` FOREIGN KEY (`booking_id`) REFERENCES `bookings`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tickets` ADD CONSTRAINT `tickets_showtime_id_show_times_id_fk` FOREIGN KEY (`showtime_id`) REFERENCES `show_times`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tickets` ADD CONSTRAINT `tickets_seat_id_seats_id_fk` FOREIGN KEY (`seat_id`) REFERENCES `seats`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `idx_room_cinema` ON `rooms` (`cinema_id`);--> statement-breakpoint
CREATE INDEX `idx_ticket_booking` ON `tickets` (`booking_id`);--> statement-breakpoint
ALTER TABLE `booking_seats` ADD CONSTRAINT `booking_seats_booking_id_bookings_id_fk` FOREIGN KEY (`booking_id`) REFERENCES `bookings`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `booking_seats` ADD CONSTRAINT `booking_seats_showtime_id_show_times_id_fk` FOREIGN KEY (`showtime_id`) REFERENCES `show_times`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `booking_seats` ADD CONSTRAINT `booking_seats_seat_id_seats_id_fk` FOREIGN KEY (`seat_id`) REFERENCES `seats`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `bookings` ADD CONSTRAINT `bookings_showtime_id_show_times_id_fk` FOREIGN KEY (`showtime_id`) REFERENCES `show_times`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `payments` ADD CONSTRAINT `payments_booking_id_bookings_id_fk` FOREIGN KEY (`booking_id`) REFERENCES `bookings`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `seats` ADD CONSTRAINT `seats_room_id_rooms_id_fk` FOREIGN KEY (`room_id`) REFERENCES `rooms`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `show_times` ADD CONSTRAINT `show_times_movie_id_movies_id_fk` FOREIGN KEY (`movie_id`) REFERENCES `movies`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `show_times` ADD CONSTRAINT `show_times_cinema_id_cinemas_id_fk` FOREIGN KEY (`cinema_id`) REFERENCES `cinemas`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `show_times` ADD CONSTRAINT `show_times_room_id_rooms_id_fk` FOREIGN KEY (`room_id`) REFERENCES `rooms`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `idx_booking_showtime` ON `bookings` (`showtime_id`);--> statement-breakpoint
CREATE INDEX `idx_booking_status` ON `bookings` (`status`);--> statement-breakpoint
CREATE INDEX `idx_booking_payment_status` ON `bookings` (`payment_status`);--> statement-breakpoint
CREATE INDEX `idx_booking_expires_at` ON `bookings` (`expires_at`);--> statement-breakpoint
CREATE INDEX `idx_movie_state` ON `movies` (`state`);--> statement-breakpoint
CREATE INDEX `idx_movie_release_date` ON `movies` (`release_date`);--> statement-breakpoint
CREATE INDEX `idx_payment_booking` ON `payments` (`booking_id`);--> statement-breakpoint
CREATE INDEX `idx_seat_room` ON `seats` (`room_id`);--> statement-breakpoint
CREATE INDEX `idx_showtime_movie_time` ON `show_times` (`movie_id`,`starts_at`);--> statement-breakpoint
CREATE INDEX `idx_showtime_cinema_time` ON `show_times` (`cinema_id`,`starts_at`);--> statement-breakpoint
ALTER TABLE `booking_seats` DROP COLUMN `id`;--> statement-breakpoint
ALTER TABLE `booking_seats` DROP COLUMN `price`;--> statement-breakpoint
ALTER TABLE `booking_seats` DROP COLUMN `status`;--> statement-breakpoint
ALTER TABLE `bookings` DROP COLUMN `total_seats`;--> statement-breakpoint
ALTER TABLE `bookings` DROP COLUMN `payment_method`;--> statement-breakpoint
ALTER TABLE `bookings` DROP COLUMN `customer_name`;--> statement-breakpoint
ALTER TABLE `bookings` DROP COLUMN `customer_email`;--> statement-breakpoint
ALTER TABLE `bookings` DROP COLUMN `customer_phone`;--> statement-breakpoint
ALTER TABLE `movies` DROP COLUMN `duration`;--> statement-breakpoint
ALTER TABLE `seats` DROP COLUMN `cinema_id`;--> statement-breakpoint
ALTER TABLE `show_times` DROP COLUMN `show_date`;--> statement-breakpoint
ALTER TABLE `show_times` DROP COLUMN `show_time`;