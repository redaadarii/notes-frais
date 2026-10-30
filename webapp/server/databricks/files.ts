import "server-only";
import { UpstreamError } from "@/server/errors";
import { databricksFetch, databricksJson } from "./client";

/** Files API : lecture et écriture dans les volumes Unity Catalog. */

/** « /Volumes/a/b/c d.pdf » → « /Volumes/a/b/c%20d.pdf » : chaque segment encodé, les « / » conservés. */
const encodePath = (path: string) => path.split("/").map(encodeURIComponent).join("/");

export async function uploadFile(path: string, content: ArrayBuffer): Promise<void> {
  await databricksFetch(`/api/2.0/fs/files${encodePath(path)}?overwrite=false`, {
    method: "PUT",
    headers: { "Content-Type": "application/octet-stream" },
    body: content,
  });
}

/** Réponse brute, pour relayer le fichier en flux au navigateur sans le charger en mémoire. */
export function downloadFile(path: string): Promise<Response> {
  return databricksFetch(`/api/2.0/fs/files${encodePath(path)}`);
}

export interface DirectoryEntry {
  path: string;
  name: string;
  isDirectory: boolean;
  fileSize: number | null;
  lastModified: number | null;
}

interface ApiDirectoryEntry {
  path: string;
  name: string;
  is_directory: boolean;
  file_size?: number;
  last_modified?: number;
}

/** Contenu d'un dossier ; un dossier inexistant est traité comme vide. */
export async function listDirectory(path: string): Promise<DirectoryEntry[]> {
  const entries: DirectoryEntry[] = [];
  let pageToken: string | undefined;
  try {
    do {
      const query = pageToken ? `?page_token=${encodeURIComponent(pageToken)}` : "";
      const page = await databricksJson<{ contents?: ApiDirectoryEntry[]; next_page_token?: string }>(
        `/api/2.0/fs/directories${encodePath(path)}${query}`,
        { expectedStatuses: [404] },
      );
      for (const e of page.contents ?? []) {
        entries.push({
          path: e.path,
          name: e.name,
          isDirectory: e.is_directory,
          fileSize: e.file_size ?? null,
          lastModified: e.last_modified ?? null,
        });
      }
      pageToken = page.next_page_token;
    } while (pageToken);
  } catch (error) {
    if (error instanceof UpstreamError && error.upstreamStatus === 404) return [];
    throw error;
  }
  return entries;
}
