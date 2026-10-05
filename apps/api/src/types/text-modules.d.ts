// Markdown files are bundled as text: wrangler's Text rule in wrangler.jsonc
// for the worker, and the markdown-as-text plugin in vite.config.ts for tests.
declare module "*.md" {
  const text: string;
  export default text;
}
