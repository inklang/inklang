import fs from "node:fs/promises";
import { spawn } from "node:child_process";

export interface InkJSON {
  name: string;
  displayName: string;
  description: string;
  package: string;
  version: string;
  git: string;
  /**
   * List of annotations used in the code (eg.: `@http::headers` is from `http`).
   */
  annotations: string[];
  examples: string[];
}

export async function readTextFile (path: string): Promise<string> {
  return fs.readFile(path, "utf8");
}

export async function readInkJSON (): Promise<InkJSON> {
  return JSON.parse(await readTextFile('ink.json'));
}

/** writes to a file directly, overwriting previous content. */
export async function write (path: string, content: string): Promise<void> {
  await fs.writeFile(path, content);
}

export async function execute (command: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: 'inherit',
      // https://stackoverflow.com/a/54515183/14642839
      shell: process.platform === 'win32'
    });

    child.on('error', reject);
    child.on('exit', resolve);
  });
}

/** creates a folder recursively and ignore if already exists. */
export async function mkdir (path: string): Promise<void> {
  await fs.mkdir(path, { recursive: true }).catch(() => void 0);
}

export async function exists (path: string): Promise<boolean> {
  try {
    await fs.access(path);
    return true;
  }
  catch {
    return false;
  }
}
