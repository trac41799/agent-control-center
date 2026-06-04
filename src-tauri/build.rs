fn main() {
    // Attempt Tauri build gracefully - handle windres absence
    let result = std::panic::catch_unwind(|| {
        tauri_build::build()
    });
    if let Err(e) = result {
        eprintln!("[build] tauri_build::build() failed (non-fatal): {:?}", e);
        // Continue without icons - library compilation is what matters
    }
}