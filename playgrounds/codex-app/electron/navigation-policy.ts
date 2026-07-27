import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

export function isTrustedRendererUrl(
  rawUrl: string,
  rendererEntryPath: string,
): boolean {
  try {
    const url = new URL(rawUrl);
    return (
      url.protocol === "file:" &&
      resolve(fileURLToPath(url)) === resolve(rendererEntryPath)
    );
  } catch {
    return false;
  }
}

export function isAllowedExternalUrl(rawUrl: string): boolean {
  try {
    return new URL(rawUrl).protocol === "https:";
  } catch {
    return false;
  }
}
