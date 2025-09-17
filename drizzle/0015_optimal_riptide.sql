ALTER TABLE `booking_seat_holds` DROP FOREIGN KEY `booking_seat_holds_booking_id_bookings_id_fk`;
--> statement-breakpoint
ALTER TABLE `booking_seat_holds` DROP FOREIGN KEY `booking_seat_holds_showtime_id_show_times_id_fk`;
--> statement-breakpoint
ALTER TABLE `booking_seat_holds` DROP FOREIGN KEY `booking_seat_holds_seat_id_seats_id_fk`;
--> statement-breakpoint
ALTER TABLE `booking_seat_holds` MODIFY COLUMN `id` varchar(36) NOT NULL;--> statement-breakpoint
ALTER TABLE `booking_seat_holds` MODIFY COLUMN `booking_id` varchar(36);--> statement-breakpoint
ALTER TABLE `payments` MODIFY COLUMN `method` enum('CARD','CASH','BANK_TRANSFER','VNPAY','MOMO','STRIPE','PAYPAL');--> statement-breakpoint
ALTER TABLE `booking_seat_holds` ADD `session_id` varchar(64) NOT NULL;--> statement-breakpoint
ALTER TABLE `booking_seat_holds` ADD `user_id` varchar(36);--> statement-breakpoint
ALTER TABLE `booking_seat_holds` ADD `updated_at` datetime DEFAULT CURRENT_TIMESTAMP NOT NULL;--> statement-breakpoint
CREATE INDEX `idx_hold_session` ON `booking_seat_holds` (`session_id`);