// Standing in for the Document model until M2. Once documents/panes/tabs
// exist, "current file path" becomes a property of the active document
// instead of a lone module-level value.
let path = $state<string | null>(null);

export function getCurrentFilePath(): string | null {
	return path;
}

export function setCurrentFilePath(newPath: string | null): void {
	path = newPath;
}
