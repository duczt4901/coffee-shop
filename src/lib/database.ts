import rawDatabase from "@/data/db.json";
import { databaseSchema } from "@/schemas/database.schema";

export const database = databaseSchema.parse(rawDatabase);
