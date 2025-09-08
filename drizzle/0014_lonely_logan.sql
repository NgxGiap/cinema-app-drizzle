CREATE TABLE `booking_seat_holds` (
	`id` varchar(36) NOT NULL DEFAULT (uuid()),
	`booking_id` varchar(36) NOT NULL,
	`showtime_id` varchar(36) NOT NULL,
	`seat_id` varchar(36) NOT NULL,
	`expires_at` datetime NOT NULL,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `booking_seat_holds_id` PRIMARY KEY(`id`),
	CONSTRAINT `uq_hold_live` UNIQUE(`showtime_id`,`seat_id`)
);
--> statement-breakpoint
ALTER TABLE `bookings` MODIFY COLUMN `currency` varchar(3) NOT NULL DEFAULT 'VND';--> statement-breakpoint
ALTER TABLE `payments` MODIFY COLUMN `currency` varchar(3) NOT NULL DEFAULT 'VND';--> statement-breakpoint
ALTER TABLE `booking_seat_holds` ADD CONSTRAINT `booking_seat_holds_booking_id_bookings_id_fk` FOREIGN KEY (`booking_id`) REFERENCES `bookings`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `booking_seat_holds` ADD CONSTRAINT `booking_seat_holds_showtime_id_showtimes_id_fk` FOREIGN KEY (`showtime_id`) REFERENCES `showtimes`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `booking_seat_holds` ADD CONSTRAINT `booking_seat_holds_seat_id_seats_id_fk` FOREIGN KEY (`seat_id`) REFERENCES `seats`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `idx_hold_expires` ON `booking_seat_holds` (`expires_at`);--> statement-breakpoint
CREATE INDEX `idx_hold_booking` ON `booking_seat_holds` (`booking_id`);