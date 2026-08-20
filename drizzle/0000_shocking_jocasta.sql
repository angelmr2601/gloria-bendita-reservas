CREATE TABLE `reservations` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`barber` text NOT NULL,
	`appointment_date` text NOT NULL,
	`appointment_time` text NOT NULL,
	`customer_name` text NOT NULL,
	`customer_phone` text NOT NULL,
	`customer_email` text NOT NULL,
	`status` text DEFAULT 'confirmed' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `reservations_slot_unique` ON `reservations` (`barber`,`appointment_date`,`appointment_time`);