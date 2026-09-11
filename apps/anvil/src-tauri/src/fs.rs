use std::fs;

// UTF-8 only for now; encoding detection and line-ending preservation land
// when a real need for them shows up (binary/large-file handling is M5).
#[tauri::command]
pub fn read_file(path: String) -> Result<String, String> {
	fs::read_to_string(&path).map_err(|err| err.to_string())
}

#[tauri::command]
pub fn write_file(path: String, contents: String) -> Result<(), String> {
	fs::write(&path, contents).map_err(|err| err.to_string())
}
