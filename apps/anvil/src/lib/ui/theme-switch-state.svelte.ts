let isOpen = $state(false);

export function isThemeSwitchOpen(): boolean {
	return isOpen;
}

export function openThemeSwitch(): void {
	isOpen = true;
}

export function closeThemeSwitch(): void {
	isOpen = false;
}
