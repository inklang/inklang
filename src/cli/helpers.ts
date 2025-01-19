import fs from "node:fs/promises";
import { spawn } from "node:child_process";

export interface InkJSON {
  version: string;
  name: string;
  displayName: string;
  package: string;
  git: string;
}

export async function readInkJSON (): Promise<InkJSON> {
  const inkJSON = await fs.readFile('ink.json', 'utf8');
  return JSON.parse(inkJSON);
}

export async function write (path: string, content: string): Promise<void> {
  await fs.writeFile(path, content);
}

export async function execute (command: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: 'inherit' });

    child.on('error', reject);
    child.on('exit', resolve);
  });
}
