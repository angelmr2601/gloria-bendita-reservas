CREATE TABLE `barber_services` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`barber` text NOT NULL,
	`code` text NOT NULL,
	`name` text NOT NULL,
	`duration_minutes` integer NOT NULL,
	`price_cents` integer NOT NULL,
	`enabled` integer DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `barber_service_unique` ON `barber_services` (`barber`,`code`);--> statement-breakpoint
ALTER TABLE `reservations` ADD `service_code` text;--> statement-breakpoint
ALTER TABLE `reservations` ADD `service_name` text;--> statement-breakpoint
ALTER TABLE `reservations` ADD `service_duration` integer;--> statement-breakpoint
ALTER TABLE `reservations` ADD `price_cents` integer;