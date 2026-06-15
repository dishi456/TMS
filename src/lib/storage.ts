import { promises as fs } from "fs";
import path from "path";

// Local-disk storage. Swap this module for an S3/R2 client later without
// touching callers — the interface (save/read/remove by key) stays the same.
// In Docker, mount a volume at /app/storage so files survive restarts.
const STORAGE_DIR = path.join(process.cwd(), "storage");

export async function saveFile(key: string, data: Buffer): Promise<void> {
  const full = path.join(STORAGE_DIR, key);
  await fs.mkdir(path.dirname(full), { recursive: true });
  await fs.writeFile(full, data);
}

export async function readFile(key: string): Promise<Buffer> {
  return fs.readFile(path.join(STORAGE_DIR, key));
}

export async function removeFile(key: string): Promise<void> {
  try {
    await fs.unlink(path.join(STORAGE_DIR, key));
  } catch {
    // already gone — ignore
  }
}
