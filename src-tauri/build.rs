fn main() {
    let result = std::panic::catch_unwind(|| {
        tauri_build::build()
    });
    if let Err(_e) = result {
        eprintln!("[build] tauri_build::build() panicked (non-fatal, continuing)");
    }
}
