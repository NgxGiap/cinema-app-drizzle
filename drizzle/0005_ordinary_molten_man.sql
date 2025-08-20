ALTER TABLE `movies` MODIFY COLUMN `id` varchar(36) NOT NULL DEFAULT (uuid());--> statement-breakpoint
ALTER TABLE `movies` MODIFY COLUMN `created_at` datetime NOT NULL DEFAULT '2025-08-20 08:51:28.151';--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `id` varchar(36) NOT NULL DEFAULT (uuid());--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `created_at` datetime NOT NULL DEFAULT '2025-08-20 08:51:28.150';