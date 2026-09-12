import { describe, expect, it } from 'vitest';
import { createKeymapResolver, mergeKeymaps, resolveEntry } from './resolver';
import type { KeyEvent, RawKeymapEntry } from './types';

function keyEvent(overrides: Partial<KeyEvent>): KeyEvent {
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

describe('mergeKeymaps', () => {
	it('keeps defaults when the user keymap is empty', () => {
		const defaults: RawKeymapEntry[] = [{ keys: ['mod+s'], command: 'file.save' }];
		const merged = mergeKeymaps(defaults, [], 'linux');
		expect(merged).toHaveLength(1);
		expect(merged[0].command).toBe('file.save');
	});

	it('lets a later user entry with an identical key sequence override the default', () => {
		const defaults: RawKeymapEntry[] = [{ keys: ['mod+s'], command: 'file.save' }];
		const user: RawKeymapEntry[] = [{ keys: ['mod+s'], command: 'file.save_as' }];
		const merged = mergeKeymaps(defaults, user, 'linux');
		expect(merged).toHaveLength(1);
		expect(merged[0].command).toBe('file.save_as');
	});

	it('treats mod+s and ctrl+s as the same sequence on linux (mod resolves to ctrl)', () => {
		const defaults: RawKeymapEntry[] = [{ keys: ['mod+s'], command: 'file.save' }];
		const user: RawKeymapEntry[] = [{ keys: ['ctrl+s'], command: 'file.save_as' }];
		const merged = mergeKeymaps(defaults, user, 'linux');
		expect(merged).toHaveLength(1);
		expect(merged[0].command).toBe('file.save_as');
	});

	it('removes a binding entirely when command is null', () => {
		const defaults: RawKeymapEntry[] = [{ keys: ['mod+d'], command: 'edit.duplicate_line' }];
		const user: RawKeymapEntry[] = [{ keys: ['mod+d'], command: null }];
		const merged = mergeKeymaps(defaults, user, 'linux');
		expect(merged).toHaveLength(0);
	});

	it('drops entries scoped to a different platform', () => {
		const defaults: RawKeymapEntry[] = [
			{ keys: ['ctrl+y'], command: 'edit.redo', platform: 'linux' },
			{ keys: ['ctrl+cmd+g'], command: 'selection.find_all', platform: 'macos' }
		];
		const merged = mergeKeymaps(defaults, [], 'linux');
		expect(merged).toHaveLength(1);
		expect(merged[0].command).toBe('edit.redo');
	});

	it('preserves defaults-then-user order for entries that do not collide', () => {
		const defaults: RawKeymapEntry[] = [{ keys: ['mod+s'], command: 'file.save' }];
		const user: RawKeymapEntry[] = [{ keys: ['mod+shift+p'], command: 'palette.show' }];
		const merged = mergeKeymaps(defaults, user, 'linux');
		expect(merged.map((e) => e.command)).toEqual(['file.save', 'palette.show']);
	});
});

describe('createKeymapResolver', () => {
	const entries = [
		resolveEntry({ keys: ['mod+s'], command: 'file.save' }, 'linux'),
		resolveEntry({ keys: ['mod+k', 'mod+b'], command: 'sidebar.toggle' }, 'linux'),
		resolveEntry({ keys: ['mod+k', 'mod+d'], command: 'selection.skip_occurrence' }, 'linux')
	];

	it('matches a single-key binding immediately', () => {
		const resolver = createKeymapResolver(entries);
		const result = resolver.handleKeyEvent(keyEvent({ key: 's', code: 'KeyS', ctrlKey: true }));
		expect(result).toEqual({ type: 'match', command: 'file.save', args: undefined });
	});

	it('tracks a pending chord and resolves it on the second keystroke', () => {
		const resolver = createKeymapResolver(entries);
		const first = resolver.handleKeyEvent(keyEvent({ key: 'k', code: 'KeyK', ctrlKey: true }));
		expect(first.type).toBe('pending');

		const second = resolver.handleKeyEvent(keyEvent({ key: 'b', code: 'KeyB', ctrlKey: true }));
		expect(second).toEqual({ type: 'match', command: 'sidebar.toggle', args: undefined });
	});

	it('disambiguates two chords sharing the same prefix', () => {
		const resolver = createKeymapResolver(entries);
		resolver.handleKeyEvent(keyEvent({ key: 'k', code: 'KeyK', ctrlKey: true }));
		const result = resolver.handleKeyEvent(keyEvent({ key: 'd', code: 'KeyD', ctrlKey: true }));
		expect(result).toEqual({ type: 'match', command: 'selection.skip_occurrence', args: undefined });
	});

	it('cancels a pending chord on a non-matching key', () => {
		const resolver = createKeymapResolver(entries);
		resolver.handleKeyEvent(keyEvent({ key: 'k', code: 'KeyK', ctrlKey: true }));
		const cancelled = resolver.handleKeyEvent(keyEvent({ key: 'x', code: 'KeyX' }));
		expect(cancelled).toEqual({ type: 'none' });
		expect(resolver.pendingKeys).toHaveLength(0);
	});

	it('ignores bare modifier keydowns without disturbing a pending chord', () => {
		const resolver = createKeymapResolver(entries);
		resolver.handleKeyEvent(keyEvent({ key: 'k', code: 'KeyK', ctrlKey: true }));
		const modifierOnly = resolver.handleKeyEvent(keyEvent({ key: 'Control', code: 'ControlLeft' }));
		expect(modifierOnly).toEqual({ type: 'none' });
		expect(resolver.pendingKeys).toHaveLength(1);
	});

	it('returns none for a key with no matching binding at all', () => {
		const resolver = createKeymapResolver(entries);
		const result = resolver.handleKeyEvent(keyEvent({ key: 'q', code: 'KeyQ', altKey: true }));
		expect(result).toEqual({ type: 'none' });
	});

	it('passes args through on match', () => {
		const withArgs = [resolveEntry({ keys: ['mod+1'], command: 'tab.focus', args: { index: 0 } }, 'linux')];
		const resolver = createKeymapResolver(withArgs);
		const result = resolver.handleKeyEvent(keyEvent({ key: '1', code: 'Digit1', ctrlKey: true }));
		expect(result).toEqual({ type: 'match', command: 'tab.focus', args: { index: 0 } });
	});
});
