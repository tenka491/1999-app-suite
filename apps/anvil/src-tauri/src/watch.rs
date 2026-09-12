use notify::{Event, EventKind, RecommendedWatcher, RecursiveMode, Watcher};
use std::path::Path;
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::Arc;
use std::time::Duration;

/// True for event kinds that mean something on disk may actually have
/// changed. Excludes `Access` — a plain read (which the frontend does every
/// time it loads a file) fires an Access event on Linux, and treating that
/// as a change causes a read → event → read feedback loop (hit this once
/// already with the keymap watcher — see docs/anvil-progress.md).
fn is_content_change(kind: &EventKind) -> bool {
	matches!(kind, EventKind::Create(_) | EventKind::Modify(_) | EventKind::Remove(_))
}

/// Watches `dir` (non-recursively) and calls `on_change` — debounced by
/// 300ms, so a burst of events collapses to one call — whenever a
/// Create/Modify/Remove event passes `matches`. Debouncing is hand-rolled
/// rather than via notify-debouncer-mini, which doesn't filter by event kind
/// at all and would reintroduce the Access-event loop.
pub fn watch_directory<M, F>(dir: &Path, matches: M, on_change: F) -> Result<RecommendedWatcher, String>
where
	M: Fn(&Event) -> bool + Send + Sync + 'static,
	F: Fn() + Send + Sync + 'static,
{
	let epoch = Arc::new(AtomicU64::new(0));
	let on_change = Arc::new(on_change);

	let mut watcher = notify::recommended_watcher(move |result: notify::Result<Event>| {
		let Ok(event) = result else { return };
		if !is_content_change(&event.kind) || !matches(&event) {
			return;
		}

		let this_epoch = epoch.fetch_add(1, Ordering::SeqCst) + 1;
		let epoch = epoch.clone();
		let on_change = on_change.clone();
		tauri::async_runtime::spawn_blocking(move || {
			std::thread::sleep(Duration::from_millis(300));
			if epoch.load(Ordering::SeqCst) == this_epoch {
				on_change();
			}
		});
	})
	.map_err(|err| err.to_string())?;

	watcher.watch(dir, RecursiveMode::NonRecursive).map_err(|err| err.to_string())?;
	Ok(watcher)
}
