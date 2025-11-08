import { instrumentDrizzleClient } from "@kubiks/otel-drizzle";
import { sql } from "drizzle-orm";
import type { AnyPgColumn } from "drizzle-orm/pg-core";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

function createDrizzle() {
	const url = process.env.DATABASE_URL;
	if (!url) throw new Error("DATABASE_URL not found");

	if (!url.startsWith("postgres://") && !url.startsWith("postgresql://"))
		throw new Error("DATABASE_URL is not a Postgres URL");

	try {
		const client = postgres(url, { 
			max: 1,
			onnotice: () => {}, // Suppress notices
		});
		
		// Test connection
		client`SELECT 1`.then(() => {
			console.log("✅ Database connection successful");
		}).catch((error) => {
			console.error("❌ Database connection failed:", error);
		});
		
		return drizzle(client);
	} catch (error) {
		console.error("❌ Failed to create database client:", error);
		throw error;
	}
}

let _cached: ReturnType<typeof createDrizzle> | undefined;

export const db = () => {
	if (!_cached) {
		_cached = createDrizzle();

		instrumentDrizzleClient(_cached);
	}
	return _cached;
};

// Use the incoming value if one exists, else fallback to the DBs existing value.
export const updateIfDefined = <T>(v: T | undefined, col: AnyPgColumn) =>
	sql`COALESCE(${v === undefined ? sql`NULL` : v}, ${col})`;
