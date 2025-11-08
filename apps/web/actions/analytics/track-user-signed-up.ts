"use server";

import { db } from "@cap/database";
import { getCurrentUser } from "@cap/database/auth/session";
import { users } from "@cap/database/schema";
import { sql } from "drizzle-orm";

type UserPreferences = {
	notifications?: {
		pauseComments: boolean;
		pauseReplies: boolean;
		pauseViews: boolean;
		pauseReactions: boolean;
	};
	trackedEvents?: {
		user_signed_up?: boolean;
	};
} | null;

export async function checkAndMarkUserSignedUpTracked(): Promise<{
	shouldTrack: boolean;
}> {
	const currentUser = await getCurrentUser();
	if (!currentUser) {
		return { shouldTrack: false };
	}

	try {
		const prefs = currentUser.preferences as UserPreferences;
		const alreadyTracked = Boolean(prefs?.trackedEvents?.user_signed_up);

		if (alreadyTracked) {
			return { shouldTrack: false };
		}

		const result = await db()
			.update(users)
			.set({
				preferences: sql`COALESCE(${users.preferences}, '{}'::jsonb) || jsonb_build_object('trackedEvents', COALESCE(${users.preferences}->'trackedEvents', '{}'::jsonb) || jsonb_build_object('user_signed_up', true))`,
			})
			.where(
				sql`(${users.id} = ${currentUser.id}) AND (${users.created_at} >= CURRENT_DATE()) AND (COALESCE(${users.preferences}->'trackedEvents'->>'user_signed_up', 'false') = 'false')`,
			);

		// In Postgres with Drizzle, result is an array with affectedRows property
		const rowCount = Array.isArray(result) ? (result[0] as any)?.affectedRows ?? 0 : (result as any)?.affectedRows ?? 0;
		return { shouldTrack: rowCount > 0 };
	} catch {
		return { shouldTrack: false };
	}
}
