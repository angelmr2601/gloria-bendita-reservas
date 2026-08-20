ALTER TABLE `reservations` ADD `management_token_hash` text;--> statement-breakpoint
CREATE UNIQUE INDEX `reservations_management_token_unique` ON `reservations` (`management_token_hash`);