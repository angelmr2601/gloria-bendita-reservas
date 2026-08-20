import { sql } from "drizzle-orm";
import { integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
export const reservations = sqliteTable("reservations", { id: integer("id").primaryKey({ autoIncrement: true }), barber: text("barber").notNull(), appointmentDate: text("appointment_date").notNull(), appointmentTime: text("appointment_time").notNull(), serviceCode: text("service_code"), serviceName: text("service_name"), serviceDuration: integer("service_duration"), priceCents: integer("price_cents"), customerName: text("customer_name").notNull(), customerPhone: text("customer_phone").notNull(), customerEmail: text("customer_email").notNull(), managementTokenHash: text("management_token_hash"), status: text("status").notNull().default("confirmed"), createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`) }, (table) => [uniqueIndex("reservations_slot_unique").on(table.barber, table.appointmentDate, table.appointmentTime), uniqueIndex("reservations_management_token_unique").on(table.managementTokenHash)]);

export const availabilityOverrides = sqliteTable("availability_overrides", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  barber: text("barber").notNull(),
  appointmentDate: text("appointment_date").notNull(),
  appointmentTime: text("appointment_time").notNull(),
  enabled: integer("enabled", { mode: "boolean" }).notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [uniqueIndex("availability_override_unique").on(table.barber, table.appointmentDate, table.appointmentTime)]);

export const barberServices = sqliteTable("barber_services", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  barber: text("barber").notNull(),
  code: text("code").notNull(),
  name: text("name").notNull(),
  durationMinutes: integer("duration_minutes").notNull(),
  priceCents: integer("price_cents").notNull(),
  enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),
}, (table) => [uniqueIndex("barber_service_unique").on(table.barber, table.code)]);
