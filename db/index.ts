import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";

declare global {
  var __GLORIA_BENDITA_DB__: D1Database | undefined;
}

export function getDb() {
  if (!globalThis.__GLORIA_BENDITA_DB__) {
    throw new Error(
      "Cloudflare D1 binding `DB` is unavailable. Set the `d1` field in .openai/hosting.json to `DB` or let your control plane inject the real binding values before using the database."
    );
  }

  return drizzle(globalThis.__GLORIA_BENDITA_DB__, { schema });
}
