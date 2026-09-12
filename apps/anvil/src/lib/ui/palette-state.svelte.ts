let isOpen = $state(false);

export function isPaletteOpen(): boolean {
	return isOpen;
}

export function openPalette(): void {
	isOpen = true;
}

export function closePalette(): void {
	isOpen = false;
}
