/**
 * Raw asset paths in `public/` are not automatically prefixed with the
 * configured basePath (unlike `next/link`), so any plain `<a href>` that
 * points at a static file must go through `withBasePath`.
 */
export const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export function withBasePath(path: string): string {
  if (!path.startsWith("/")) return path;
  return `${basePath}${path}`;
}
