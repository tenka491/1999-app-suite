import type { Platform } from './types';

// Sniffing navigator.platform rather than pulling in @tauri-apps/plugin-os for
// a single ctrl-vs-cmd check — Linux and macOS are the only supported v1
// platforms (PRD §2), and both webviews report this reliably.
export function detectPlatform(): Platform {
	if (typeof navigator === 'undefined') return 'linux';
	const platform = navigator.platform.toLowerCase();
	if (platform.includes('mac')) return 'macos';
	if (platform.includes('win')) return 'windows';
	return 'linux';
}
