import { URL } from "node:url";

type URLParseResult = {
  domain?: string;
  path?: string;
};

const ALLOWED_PROTOCOLS = new Set(["http:", "https:"]);
const MAX_URL_LENGTH = 8192;

function safeURLParsing(urlStr: string): URLParseResult {
  if (!urlStr || typeof urlStr !== "string") {
    return { path: "" };
  }

  if (urlStr.length > MAX_URL_LENGTH) {
    urlStr = urlStr.substring(0, MAX_URL_LENGTH);
  }

  if (!/^https?:\/\//i.test(urlStr)) {
    return { path: urlStr };
  }

  try {
    const url = new URL(urlStr);

    if (!ALLOWED_PROTOCOLS.has(url.protocol)) {
      return { path: "" };
    }

    return {
      domain: url.origin,
      path: url.pathname + url.search + url.hash,
    };
  } catch {
    return { path: "" };
  }
}

function truncatePath(path: string, maxLength: number): string {
  if (!path || path.length <= maxLength) return path;

  const { domain, path: pathPart } = safeURLParsing(path);

  if (domain) {
    if (domain.length >= maxLength - 3) {
      return domain.slice(0, maxLength - 3) + "...";
    }

    return domain + truncatePath(pathPart || "/", maxLength - domain.length);
  }

  const segments = path.split("/");

  if (segments.length <= 2) {
    return path.slice(0, maxLength - 3) + "...";
  }

  const firstSegment = segments[0] || "/";
  const lastSegment = segments[segments.length - 1] || "";

  if (firstSegment.length + lastSegment.length + 5 > maxLength) {
    return path.slice(0, maxLength - 3) + "...";
  }

  return `${firstSegment}/.../${lastSegment}`;
}

export { safeURLParsing, truncatePath };
