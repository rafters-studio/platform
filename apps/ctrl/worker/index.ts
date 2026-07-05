// ctrl is a static SPA mounted at rafters.studio/ctrl/*. The route hands
// this worker /ctrl-prefixed paths while Vite's dist/ is unprefixed, so
// strip the prefix and let the assets binding (SPA fallback) do the rest.
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === "/ctrl" || url.pathname.startsWith("/ctrl/")) {
      url.pathname = url.pathname.slice("/ctrl".length) || "/";
    }
    return env.ASSETS.fetch(new Request(url, request));
  },
};
