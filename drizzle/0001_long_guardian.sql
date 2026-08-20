CREATE TABLE `availability_overrides` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`barber` text NOT NULL,
	`appointment_date` text NOT NULL,
	`appointment_time` text NOT NULL,
	`enabled` integer NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `availability_override_unique` ON `availability_overrides` (`barber`,`appointment_date`,`appointment_time`);