import { fetchPackageIndex } from "../registry.js";
import type { IndexPackage } from "../types.js";

export interface SearchResult {
  query: string;
  packages: IndexPackage[];
}

export async function searchCommand(query: string): Promise<SearchResult> {
  const index = await fetchPackageIndex();
  const q = query.toLowerCase().trim();

  const packages = index.packages.filter((pkg) => {
    return (
      pkg.name.toLowerCase().includes(q) ||
      pkg.description.toLowerCase().includes(q) ||
      pkg.author.toLowerCase().includes(q) ||
      pkg.id.toLowerCase().includes(q) ||
      (pkg.keywords ?? []).some((kw) => kw.toLowerCase().includes(q))
    );
  });

  return { query, packages };
}
