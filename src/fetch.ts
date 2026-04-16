export const REGISTRY_OWNER = "tarshub";
export const REGISTRY_REPO = "registry";
export const RAW_BASE = "https://raw.githubusercontent.com";
export const REGISTRY_BASE = `${RAW_BASE}/${REGISTRY_OWNER}/${REGISTRY_REPO}/main`;

export interface FetchTextResult {
  ok: boolean;
  status: number;
  text: string;
}

export async function fetchText(url: string): Promise<FetchTextResult> {
  let res: Response;
  try {
    res = await fetch(url);
  } catch {
    throw new Error("Network error. Check your connection and try again.");
  }
  const text = res.ok ? await res.text() : "";
  return { ok: res.ok, status: res.status, text };
}

export async function fetchJson<T>(url: string): Promise<T> {
  const { ok, status, text } = await fetchText(url);
  if (!ok) {
    const err = new Error(`HTTP ${status} fetching ${url}`) as Error & { status: number };
    err.status = status;
    throw err;
  }
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(`Invalid JSON response from ${url}`);
  }
}

/**
 * Registry manifest URL: packages/<owner>/<repo>/tarshub.json or
 * packages/<owner>/<repo>/<sub...>/tarshub.json
 */
export function registryManifestUrl(packageId: string): string {
  const path = packageId
    .split("/")
    .map((s) => encodeURIComponent(s))
    .join("/");
  return `${REGISTRY_BASE}/packages/${path}/tarshub.json`;
}

/** Join optional repo subpath (package root inside GitHub repo) with a file path. */
export function joinRepoPath(subpath: string | undefined, filePath: string): string {
  const s = (subpath ?? "").replace(/^\/+|\/+$/g, "");
  if (!s) return filePath;
  return `${s}/${filePath}`;
}

export function repoFileUrl(repo: string, branch: string, filePath: string): string {
  return `${RAW_BASE}/${repo}/${branch}/${filePath}`;
}

export function indexUrl(): string {
  return `${REGISTRY_BASE}/_index.json`;
}
