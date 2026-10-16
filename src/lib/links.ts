/** Internal path ("/categories/tv") or an absolute https:// URL. Never javascript:, data:, //host, etc. */
export function isAllowedLink(value: string) {
  if (/^\/(?!\/)[^\s\\]*$/.test(value)) return true;
  try {
    const url = new URL(value);
    return url.protocol === "https:";
  } catch {
    return false;
  }
}
