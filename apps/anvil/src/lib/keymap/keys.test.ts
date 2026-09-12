import { describe, expect, it } from 'vitest';
import { eventToKeystroke, formatKeystroke, parseKeystroke } from './keys';
import type { KeyEvent } from './types';

function fakeEvent(overrides: Partial<KeyEvent>): KeyEvent {
	return {
		key: '',
		code: '',
		ctrlKey: false,
		altKey: false,
		shiftKey: false,
		metaKey: false,
		...overrides
	};
}

describe('parseKeystroke', () => {
	it('resolves mod to ctrl on linux', () => {
		expect(parseKeystroke('mod+s', 'linux')).toEqual({
			ctrl: true,
			alt: false,
			shift: false,
			meta: false,
			token: 's'
		});
	});

	it('resolves mod to meta (cmd) on macos', () => {
		expect(parseKeystroke('mod+s', 'macos')).toEqual({
			ctrl: false,
			alt: false,
			shift: false,
			meta: true,
			token: 's'
		});
	});

	it('accepts modifier aliases (option, cmd, control) case-insensitively', () => {
		expect(parseKeystroke('OPTION+Control+cmd+p', 'linux')).toEqual({
			ctrl: true,
			alt: true,
			shift: false,
			meta: true,
			token: 'p'
		});
	});

	it('does not care about modifier order', () => {
		expect(parseKeystroke('shift+mod+p', 'linux')).toEqual(parseKeystroke('mod+shift+p', 'linux'));
	});

	it('normalizes named key aliases', () => {
		expect(parseKeystroke('mod+up', 'linux').token).toBe('arrowup');
		expect(parseKeystroke('esc', 'linux').token).toBe('escape');
	});

	it('normalizes punctuation to the same token eventToKeystroke would produce', () => {
		expect(parseKeystroke('mod+/', 'linux').token).toBe('/');
	});

	it('throws when there is no non-modifier key', () => {
		expect(() => parseKeystroke('mod+shift', 'linux')).toThrow();
	});
});

describe('eventToKeystroke', () => {
	it('matches punctuation by code, ignoring shift-produced characters', () => {
		// Physical "/" key, but shift is held so event.key is "?" on a US layout.
		const keystroke = eventToKeystroke(
			fakeEvent({ key: '?', code: 'Slash', shiftKey: true, ctrlKey: true })
		);
		expect(keystroke.token).toBe('/');
		expect(keystroke.shift).toBe(true);
		expect(keystroke.ctrl).toBe(true);
	});

	it('matches letters by key, lowercased', () => {
		const keystroke = eventToKeystroke(fakeEvent({ key: 'P', code: 'KeyP', shiftKey: true }));
		expect(keystroke.token).toBe('p');
	});

	it('produces the same token shape parseKeystroke produces for a config entry', () => {
		const fromConfig = parseKeystroke('mod+shift+p', 'linux');
		const fromEvent = eventToKeystroke(
			fakeEvent({ key: 'P', code: 'KeyP', ctrlKey: true, shiftKey: true })
		);
		expect(fromEvent).toEqual(fromConfig);
	});

	it('matches Tab by code even when key is "Unidentified" (WebKitGTK Shift-Tab quirk)', () => {
		// Confirmed live: WebKitGTK reports event.key as the literal string
		// "Unidentified" for Shift-Tab specifically (likely an X11 ISO_Left_Tab
		// keysym quirk), while event.code stays "Tab" regardless of shift.
		const keystroke = eventToKeystroke(
			fakeEvent({ key: 'Unidentified', code: 'Tab', shiftKey: true })
		);
		expect(keystroke).toEqual(parseKeystroke('shift+tab', 'linux'));
	});
});

describe('formatKeystroke', () => {
	it('displays ctrl as "mod" on linux and meta as "mod" on macos', () => {
		const linuxCtrlS = parseKeystroke('mod+s', 'linux');
		const macMetaS = parseKeystroke('mod+s', 'macos');
		expect(formatKeystroke(linuxCtrlS, 'linux')).toBe('mod+s');
		expect(formatKeystroke(macMetaS, 'macos')).toBe('mod+s');
	});
});
