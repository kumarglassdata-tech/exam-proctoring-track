use tauri::Window;
use sysinfo::System;
use serde::Serialize;

#[derive(Serialize)]
pub struct ProcessInfo {
    pub name: String,
    pub pid: u32,
    pub category: String,
}

const FORBIDDEN_LIST: &[(&str, &str)] = &[
    ("whatsapp", "Communication"),
    ("telegram", "Communication"),
    ("discord", "Communication"),
    ("slack", "Communication"),
    ("teams", "Communication"),
    ("skype", "Communication"),
    ("zoom", "Communication"),
    ("anydesk", "Remote Desktop"),
    ("teamviewer", "Remote Desktop"),
    ("rustdesk", "Remote Desktop"),
    ("ultraviewer", "Remote Desktop"),
    ("vnc", "Remote Desktop"),
    ("obs64", "Screen Recording"),
    ("obs32", "Screen Recording"),
    ("obs", "Screen Recording"),
    ("bandicam", "Screen Recording"),
    ("camtasia", "Screen Recording"),
    ("snippingtool", "Screen Recording"),
    ("chrome", "Web Browser"),
    ("msedge.exe", "Web Browser"),
    ("firefox", "Web Browser"),
    ("brave", "Web Browser"),
    ("opera", "Web Browser"),
    ("chatgpt", "AI Assistant"),
    ("claude", "AI Assistant"),
];

#[cfg(target_os = "windows")]
mod win_lockdown {
    use std::ptr::null_mut;
    use std::sync::atomic::{AtomicBool, AtomicU32, Ordering};
    use std::sync::Mutex;
    use std::thread;
    use std::time::Duration;

    pub static IS_LOCKED: AtomicBool = AtomicBool::new(false);
    static HOOK_THREAD_ID: AtomicU32 = AtomicU32::new(0);

    type HHOOK = *mut std::ffi::c_void;
    type HWND = *mut std::ffi::c_void;
    type LRESULT = isize;
    type WPARAM = usize;
    type LPARAM = isize;
    type BOOL = i32;
    type HOOKPROC = Option<unsafe extern "system" fn(code: i32, wparam: WPARAM, lparam: LPARAM) -> LRESULT>;
    type WNDENUMPROC = Option<unsafe extern "system" fn(hwnd: HWND, lparam: LPARAM) -> BOOL>;

    #[repr(C)]
    #[derive(Copy, Clone)]
    struct KBDLLHOOKSTRUCT {
        vk_code: u32,
        scan_code: u32,
        flags: u32,
        time: u32,
        extra_info: usize,
    }

    #[repr(C)]
    struct MSG {
        hwnd: HWND,
        message: u32,
        w_param: WPARAM,
        l_param: LPARAM,
        time: u32,
        pt_x: i32,
        pt_y: i32,
    }

    #[link(name = "user32")]
    extern "system" {
        fn SetWindowsHookExW(id_hook: i32, lpfn: HOOKPROC, hmod: *mut std::ffi::c_void, dw_thread_id: u32) -> HHOOK;
        fn UnhookWindowsHookEx(hhk: HHOOK) -> BOOL;
        fn CallNextHookEx(hhk: HHOOK, n_code: i32, w_param: WPARAM, l_param: LPARAM) -> LRESULT;
        fn GetMessageW(lp_msg: *mut MSG, hwnd: HWND, w_msg_filter_min: u32, w_msg_filter_max: u32) -> BOOL;
        fn PostThreadMessageW(id_thread: u32, msg: u32, w_param: WPARAM, l_param: LPARAM) -> BOOL;
        fn GetForegroundWindow() -> HWND;
        fn SetForegroundWindow(hwnd: HWND) -> BOOL;
        fn BringWindowToTop(hwnd: HWND) -> BOOL;
        fn SetFocus(hwnd: HWND) -> HWND;
        fn EnumWindows(lp_enum_func: WNDENUMPROC, l_param: LPARAM) -> BOOL;
        fn GetWindowThreadProcessId(hwnd: HWND, lpdw_process_id: *mut u32) -> u32;
        fn IsWindowVisible(hwnd: HWND) -> BOOL;
        fn GetCurrentThreadId() -> u32;
        fn AttachThreadInput(id_attach: u32, id_attach_to: u32, f_attach: BOOL) -> BOOL;
    }

    static HOOK_HANDLE: Mutex<Option<usize>> = Mutex::new(None);

    unsafe extern "system" fn keyboard_hook_proc(code: i32, wparam: WPARAM, lparam: LPARAM) -> LRESULT {
        if code >= 0 && IS_LOCKED.load(Ordering::SeqCst) {
            let kbd = *(lparam as *const KBDLLHOOKSTRUCT);
            let vk = kbd.vk_code;
            let flags = kbd.flags;
            let alt_down = (flags & 0x20) != 0;

            // Block Windows Keys (Start menu, Win+Tab, Win+D, Win+E, etc.)
            if vk == 0x5B || vk == 0x5C {
                return 1;
            }
            // Block Alt + Tab
            if vk == 0x09 && alt_down {
                return 1;
            }
            // Block Alt + Esc
            if vk == 0x1B && alt_down {
                return 1;
            }
            // Block Escape key alone when alt is held or bare Ctrl+Esc
            if vk == 0x1B && alt_down {
                return 1;
            }
            // Block Alt + F4 (prevent closing the exam window)
            if vk == 0x73 && alt_down {
                return 1;
            }
            // Block PrintScreen
            if vk == 0x2C {
                return 1;
            }
        }
        CallNextHookEx(null_mut(), code, wparam, lparam)
    }

    unsafe extern "system" fn enum_wnd_callback(hwnd: HWND, lparam: LPARAM) -> BOOL {
        let mut pid: u32 = 0;
        GetWindowThreadProcessId(hwnd, &mut pid);
        let target_pid = std::process::id();
        if pid == target_pid && IsWindowVisible(hwnd) != 0 {
            let out_ptr = lparam as *mut HWND;
            *out_ptr = hwnd;
            return 0; // stop enum
        }
        1 // continue
    }

    pub fn get_app_hwnd() -> HWND {
        let mut found: HWND = null_mut();
        unsafe {
            EnumWindows(Some(enum_wnd_callback), &mut found as *mut HWND as LPARAM);
        }
        found
    }

    pub fn force_app_foreground() {
        let hwnd = get_app_hwnd();
        if hwnd.is_null() {
            return;
        }
        unsafe {
            let fg = GetForegroundWindow();
            if fg != hwnd {
                let fg_thread = GetWindowThreadProcessId(fg, null_mut());
                let cur_thread = GetCurrentThreadId();
                if fg_thread != 0 && fg_thread != cur_thread {
                    AttachThreadInput(cur_thread, fg_thread, 1);
                    SetForegroundWindow(hwnd);
                    BringWindowToTop(hwnd);
                    SetFocus(hwnd);
                    AttachThreadInput(cur_thread, fg_thread, 0);
                } else {
                    SetForegroundWindow(hwnd);
                    BringWindowToTop(hwnd);
                    SetFocus(hwnd);
                }
            }
        }
    }

    pub fn start_kiosk_lock() {
        if IS_LOCKED.swap(true, Ordering::SeqCst) {
            return;
        }

        thread::spawn(|| {
            unsafe {
                let tid = GetCurrentThreadId();
                HOOK_THREAD_ID.store(tid, Ordering::SeqCst);

                let hook = SetWindowsHookExW(13, Some(keyboard_hook_proc), null_mut(), 0);
                if !hook.is_null() {
                    *HOOK_HANDLE.lock().unwrap() = Some(hook as usize);
                }

                let mut msg: MSG = std::mem::zeroed();
                while GetMessageW(&mut msg, null_mut(), 0, 0) > 0 {}

                if let Some(h) = HOOK_HANDLE.lock().unwrap().take() {
                    UnhookWindowsHookEx(h as HHOOK);
                }
                HOOK_THREAD_ID.store(0, Ordering::SeqCst);
            }
        });

        thread::spawn(|| {
            while IS_LOCKED.load(Ordering::SeqCst) {
                force_app_foreground();
                thread::sleep(Duration::from_millis(150));
            }
        });
    }

    pub fn stop_kiosk_lock() {
        if !IS_LOCKED.swap(false, Ordering::SeqCst) {
            return;
        }
        unsafe {
            let tid = HOOK_THREAD_ID.load(Ordering::SeqCst);
            if tid != 0 {
                PostThreadMessageW(tid, 0x0012, 0, 0);
            }
            if let Some(h) = HOOK_HANDLE.lock().unwrap().take() {
                UnhookWindowsHookEx(h as HHOOK);
            }
        }
    }
}

#[tauri::command]
fn engage_lockdown(window: Window) -> Result<(), String> {
    window.set_fullscreen(true).map_err(|e| e.to_string())?;
    window.set_always_on_top(true).map_err(|e| e.to_string())?;
    window.set_resizable(false).map_err(|e| e.to_string())?;
    #[cfg(target_os = "windows")]
    win_lockdown::start_kiosk_lock();
    Ok(())
}

#[tauri::command]
fn release_lockdown(window: Window) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    win_lockdown::stop_kiosk_lock();
    window.set_fullscreen(false).map_err(|e| e.to_string())?;
    window.set_always_on_top(false).map_err(|e| e.to_string())?;
    window.set_resizable(true).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn refocus_window(window: Window) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    win_lockdown::force_app_foreground();
    window.set_focus().map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn get_forbidden_processes() -> Vec<ProcessInfo> {
    let mut sys = System::new_all();
    sys.refresh_all();

    let mut detected = Vec::new();
    let current_pid = std::process::id();

    for (pid, process) in sys.processes() {
        let p_u32 = pid.as_u32();
        if p_u32 == current_pid {
            continue;
        }

        let p_name = process.name().to_string_lossy().to_lowercase();
        let cmd = process
            .cmd()
            .iter()
            .map(|s| s.to_string_lossy().to_lowercase())
            .collect::<Vec<_>>()
            .join(" ");
        let exe_str = process
            .exe()
            .map(|p| p.to_string_lossy().to_lowercase())
            .unwrap_or_default();

        // NEVER flag WebView2, msedgewebview2, or ExamGuard's own UI runtime
        if p_name.contains("webview2")
            || p_name.contains("msedgewebview2")
            || cmd.contains("webview2")
            || exe_str.contains("webview2")
            || p_name.contains("examguard")
            || cmd.contains("examguard")
            || p_name.contains("cargo")
            || p_name.contains("vite")
        {
            continue;
        }

        for &(forbidden, cat) in FORBIDDEN_LIST {
            let matched = if forbidden == "msedge.exe" {
                p_name == "msedge.exe" || p_name == "msedge"
            } else {
                p_name.contains(forbidden) || cmd.contains(forbidden) || exe_str.contains(forbidden)
            };

            if matched {
                detected.push(ProcessInfo {
                    name: process.name().to_string_lossy().to_string(),
                    pid: p_u32,
                    category: cat.to_string(),
                });
                break;
            }
        }
    }

    detected
}

#[tauri::command]
fn kill_process(pid: u32) -> Result<bool, String> {
    let mut sys = System::new_all();
    sys.refresh_all();
    if let Some(process) = sys.process(sysinfo::Pid::from_u32(pid)) {
        Ok(process.kill())
    } else {
        Err("Process not found".into())
    }
}

#[tauri::command]
fn kill_all_forbidden() -> Result<u32, String> {
    let mut sys = System::new_all();
    sys.refresh_all();
    let mut count = 0;
    let current_pid = std::process::id();

    for (pid, process) in sys.processes() {
        let p_u32 = pid.as_u32();
        if p_u32 == current_pid {
            continue;
        }

        let p_name = process.name().to_string_lossy().to_lowercase();
        let cmd = process
            .cmd()
            .iter()
            .map(|s| s.to_string_lossy().to_lowercase())
            .collect::<Vec<_>>()
            .join(" ");
        let exe_str = process
            .exe()
            .map(|p| p.to_string_lossy().to_lowercase())
            .unwrap_or_default();

        // NEVER kill WebView2 or ExamGuard's own UI runtime
        if p_name.contains("webview2")
            || p_name.contains("msedgewebview2")
            || cmd.contains("webview2")
            || exe_str.contains("webview2")
            || p_name.contains("examguard")
            || cmd.contains("examguard")
            || p_name.contains("cargo")
            || p_name.contains("vite")
        {
            continue;
        }

        for &(forbidden, _) in FORBIDDEN_LIST {
            let matched = if forbidden == "msedge.exe" {
                p_name == "msedge.exe" || p_name == "msedge"
            } else {
                p_name.contains(forbidden) || cmd.contains(forbidden) || exe_str.contains(forbidden)
            };

            if matched {
                if process.kill() {
                    count += 1;
                }
                break;
            }
        }
    }
    Ok(count)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            engage_lockdown,
            release_lockdown,
            refocus_window,
            get_forbidden_processes,
            kill_process,
            kill_all_forbidden
        ])
        .run(tauri::generate_context!())
        .expect("error while running ExamGuard application");
}
