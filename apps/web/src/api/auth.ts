import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "../db/schema";

const authCache = new WeakMap<D1Database, ReturnType<typeof betterAuth>>();

export function getAuth(d1: D1Database) {
	let auth = authCache.get(d1);
	if (!auth) {
		const db = drizzle(d1, { schema });
		auth = betterAuth({
			database: drizzleAdapter(db, {
				provider: "sqlite",
				schema,
			}),
			baseURL: "https://rafters.studio",
			basePath: "/api/auth",
			emailAndPassword: {
				enabled: true,
			},
			session: {
				cookieCache: {
					enabled: true,
					maxAge: 5 * 60,
				},
			},
		});
		authCache.set(d1, auth);
	}
	return auth;
}

export type Auth = ReturnType<typeof getAuth>;
