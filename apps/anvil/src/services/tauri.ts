import { invoke } from "@tauri-apps/api/core";

export async function openFolder(): Promise<string[]> {
  return await invoke("open_folder");
}

export async function readFile(path: string): Promise<string> {
  return await invoke("read_file", { path });
}

export async function saveFile(path: string, content: string): Promise<void> {
  return await invoke("save_file", { path, content });
}
