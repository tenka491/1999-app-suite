export type ConfirmChoice = 'save' | 'discard' | 'cancel';

export interface ConfirmRequest {
	message: string;
	resolve: (choice: ConfirmChoice) => void;
}

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
			message,
			resolve: (choice) => {
				request = null;
				resolve(choice);
			}
		};
	});
}
