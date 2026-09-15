export type ConfirmChoice = 'save' | 'discard' | 'cancel';

interface UnsavedChangesRequest {
	kind: 'unsaved-changes';
	message: string;
	resolve: (choice: ConfirmChoice) => void;
}

interface SimpleConfirmRequest {
	kind: 'confirm';
	message: string;
	confirmLabel: string;
	resolve: (confirmed: boolean) => void;
}

export type ConfirmRequest = UnsavedChangesRequest | SimpleConfirmRequest;

let request = $state<ConfirmRequest | null>(null);

export function getConfirmRequest(): ConfirmRequest | null {
	return request;
}

/** Save / Don't Save / Cancel — an in-app modal rather than a native dialog,
 *  since Tauri's dialog plugin doesn't do three custom-labeled buttons and
 *  the suite's own styling is the stated preference here (PRD §F6 makes the
 *  same call for the find bar). */
export function askUnsavedChanges(message: string): Promise<ConfirmChoice> {
	return new Promise((resolve) => {
		request = {
			kind: 'unsaved-changes',
			message,
			resolve: (choice) => {
				request = null;
				resolve(choice);
			}
		};
	});
}

/** A plain Cancel/confirm prompt — e.g. the large-file-open warning (§F3).
 *  Shares ConfirmModal/this same request slot with askUnsavedChanges rather
 *  than a second modal component, since it's the same "message + buttons,
 *  promise-based" shape either way. */
export function askConfirm(message: string, confirmLabel: string): Promise<boolean> {
	return new Promise((resolve) => {
		request = {
			kind: 'confirm',
			message,
			confirmLabel,
			resolve: (confirmed) => {
				request = null;
				resolve(confirmed);
			}
		};
	});
}
