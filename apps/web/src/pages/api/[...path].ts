import type { APIRoute } from "astro";
import app from "../../api/app";

export const prerender = false;

export const ALL: APIRoute = (context) => {
	return app.fetch(context.request, context.locals.runtime?.env);
};
