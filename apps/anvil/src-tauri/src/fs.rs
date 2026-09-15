use serde::Serialize;
use std::fs;

#[derive(Serialize)]
pub struct ReadFileResult {
	contents: String,
	line_ending: &'static str,
}

// UTF-8 only for now; encoding detection lands when a real need for it shows
// up. Line endings ARE handled: CRLF files are normalized to LF for
// CodeMirror (which works in LF internally) and the original ending is
// restored on write.
#[tauri::command]
pub fn read_file(path: String) -> Result<ReadFileResult, String> {
	let bytes = fs::read(&path).map_err(|err| err.to_string())?;
	// Read as raw bytes first (not read_to_string) so a failed UTF-8 check
	// gets our own message (F3: binary/non-UTF-8 files should error, not
	// open as garbage) instead of Rust's generic "stream did not contain
	// valid UTF-8". Most binary files fail this too, so it doubles as the
	// binary-file check the PRD asks for without separate sniffing logic.
	let raw = String::from_utf8(bytes)
		.map_err(|_| "This file isn't valid UTF-8 text and can't be opened.".to_string())?;
	if raw.contains("\r\n") {
		Ok(ReadFileResult { contents: raw.replace("\r\n", "\n"), line_ending: "crlf" })
	} else {
		Ok(ReadFileResult { contents: raw, line_ending: "lf" })
	}
}

/// Byte length only — checked before read_file so a large file can be
/// warned about (F3: "must open without freezing... above that, show a
/// warning") without reading it into memory first just to find out.
#[tauri::command]
pub fn get_file_size(path: String) -> Result<u64, String> {
	fs::metadata(&path).map(|metadata| metadata.len()).map_err(|err| err.to_string())
}

#[tauri::command]
pub fn write_file(path: String, contents: String, line_ending: String) -> Result<(), String> {
	let output = if line_ending == "crlf" { contents.replace('\n', "\r\n") } else { contents };
	fs::write(&path, output).map_err(|err| err.to_string())
}
