export interface ToastMessage {
	id: number;
	text: string;
	level: 'error' | 'info';
}

let nextId = 0;
let messages = $state<ToastMessage[]>([]);

export function getToasts(): ToastMessage[] {
	return messages;
}

export function showToast(text: string, level: ToastMessage['level'] = 'info', durationMs = 6000): void {
	const id = nextId++;
	messages.push({ id, text, level });
	setTimeout(() => dismissToast(id), durationMs);
}

export function dismissToast(id: number): void {
	const index = messages.findIndex((m) => m.id === id);
	if (index !== -1) messages.splice(index, 1);
}
