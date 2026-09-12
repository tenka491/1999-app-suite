use serde::Serialize;
use std::fs;

#[derive(Serialize)]
pub struct ReadFileResult {
	contents: String,
	line_ending: &'static str,
}

// UTF-8 only for now; encoding detection lands when a real need for it shows
// up (binary/large-file handling is M5). Line endings ARE handled: CRLF
// files are normalized to LF for CodeMirror (which works in LF internally)
// and the original ending is restored on write.
#[tauri::command]
pub fn read_file(path: String) -> Result<ReadFileResult, String> {
	let raw = fs::read_to_string(&path).map_err(|err| err.to_string())?;
	if raw.contains("\r\n") {
		Ok(ReadFileResult { contents: raw.replace("\r\n", "\n"), line_ending: "crlf" })
	} else {
		Ok(ReadFileResult { contents: raw, line_ending: "lf" })
	}
}

#[tauri::command]
pub fn write_file(path: String, contents: String, line_ending: String) -> Result<(), String> {
	let output = if line_ending == "crlf" { contents.replace('\n', "\r\n") } else { contents };
	fs::write(&path, output).map_err(|err| err.to_string())
}
