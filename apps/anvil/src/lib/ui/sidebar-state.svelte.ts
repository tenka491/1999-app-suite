let visible = $state(true);

export function isSidebarVisible(): boolean {
	return visible;
}

export function toggleSidebar(): void {
	visible = !visible;
}
