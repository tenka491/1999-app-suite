import { writeTextFile, readTextFile, exists } from '@tauri-apps/plugin-fs';
import { appDataDir } from '@tauri-apps/api/path';

const SETTINGS_FILE = 'settings.json';

export type PomodoroSettings = {
  workMinutes: number;
  breakMinutes: number;
};

export async function getSettings(): Promise<PomodoroSettings> {
  try {
    const dir = await appDataDir();
    const filePath = `${dir}/${SETTINGS_FILE}`;

    const fileExists = await exists(filePath);
    if (!fileExists) {
      return { workMinutes: 25, breakMinutes: 5 };
    }

    const content = await readTextFile(filePath);
    return JSON.parse(content);
  } catch (e) {
    console.error('Failed to load settings', e);
    return { workMinutes: 25, breakMinutes: 5 };
  }
}

export async function saveSettings(settings: PomodoroSettings) {
  try {
    const dir = await appDataDir(); // Corrected method for app data directory
    const filePath = `${dir}/${SETTINGS_FILE}`;
    console.log({filePath})
    await writeTextFile(filePath, JSON.stringify(settings));
  } catch (e) {
    console.error('Failed to save settings', e);
  }
}
