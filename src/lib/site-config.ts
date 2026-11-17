import rawDatabase from "@/data/db.json";
import type { Database } from "@/schemas/database.schema";

// RootLayout validates this same file on the server; clients only need its values.
export const siteConfig: Database = rawDatabase;
