let isOpen = $state(false);
let showReplace = $state(false);

export function isFindBarOpen(): boolean {
	return isOpen;
}

export function isFindBarShowingReplace(): boolean {
	return showReplace;
}

export function openFindBar(withReplace: boolean): void {
	isOpen = true;
	showReplace = withReplace;
}

export function closeFindBar(): void {
	isOpen = false;
}
