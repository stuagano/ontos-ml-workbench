/**
 * Resolve an image path to a fetchable URL.
 *
 * - Unity Catalog volume paths (/Volumes/...) are routed through the backend proxy.
 * - HTTP(S) URLs are returned as-is.
 * - Anything else is returned as-is (fallback).
 */
export function resolveImageUrl(path: string): string {
  if (!path) return "";

  // Already an HTTP URL — use directly
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }

  // Volume path — proxy through backend
  if (path.startsWith("/Volumes/")) {
    return `/api/v1/images/proxy?path=${encodeURIComponent(path)}`;
  }

  // Fallback: return as-is
  return path;
}
