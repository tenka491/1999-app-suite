let isOpen = $state(false);

export function isGotoLineOpen(): boolean {
	return isOpen;
}

export function openGotoLine(): void {
	isOpen = true;
}

export function closeGotoLine(): void {
	isOpen = false;
}
