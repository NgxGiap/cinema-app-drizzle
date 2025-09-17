ALTER TABLE `booking_seats` MODIFY COLUMN `created_at` datetime NOT NULL DEFAULT '2025-08-26 17:30:48.863';--> statement-breakpoint
ALTER TABLE `bookings` MODIFY COLUMN `created_at` datetime NOT NULL DEFAULT '2025-08-26 17:30:48.863';--> statement-breakpoint
ALTER TABLE `cinemas` MODIFY COLUMN `created_at` datetime NOT NULL DEFAULT '2025-08-26 17:30:48.862';--> statement-breakpoint
ALTER TABLE `movies` MODIFY COLUMN `created_at` datetime NOT NULL DEFAULT '2025-08-26 17:30:48.862';--> statement-breakpoint
ALTER TABLE `payments` MODIFY COLUMN `created_at` datetime NOT NULL DEFAULT '2025-08-26 17:30:48.863';--> statement-breakpoint
ALTER TABLE `seats` MODIFY COLUMN `created_at` datetime NOT NULL DEFAULT '2025-08-26 17:30:48.863';--> statement-breakpoint
ALTER TABLE `show_times` MODIFY COLUMN `created_at` datetime NOT NULL DEFAULT '2025-08-26 17:30:48.863';--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `created_at` datetime NOT NULL DEFAULT '2025-08-26 17:30:48.861';