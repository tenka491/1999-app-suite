let isOpen = $state(false);

export function isGotoAnythingOpen(): boolean {
	return isOpen;
}

export function openGotoAnything(): void {
	isOpen = true;
}

export function closeGotoAnything(): void {
	isOpen = false;
}
