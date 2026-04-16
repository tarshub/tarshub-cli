export interface TarsHubJson {
  name: string;
  description: string;
  version?: string;
  keywords?: string[];
  listed?: boolean;
  files: string[];
}

/** Shape of packages/.../tarshub.json in tarshub/registry */
export interface RegistryEntry extends TarsHubJson {
  repo: string;
  /** Empty string or omitted = package at repo root; otherwise path inside the repo */
  subpath?: string;
}

export interface IndexPackage {
  id: string;
  name: string;
  author: string;
  avatar: string;
  repo: string;
  subpath?: string;
  description: string;
  keywords?: string[];
  files: number;
  version?: string;
}

export interface PackageIndex {
  updated: string;
  packages: IndexPackage[];
}
