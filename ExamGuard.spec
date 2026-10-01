# -*- mode: python ; coding: utf-8 -*-


a = Analysis(
    ['C:\\Users\\nchar\\OneDrive\\Desktop\\exam_guard\\client\\main.py'],
    pathex=[],
    binaries=[],
    datas=[('C:\\Users\\nchar\\OneDrive\\Desktop\\exam_guard\\client\\ui', 'client/ui')],
    hiddenimports=['webview', 'psutil', 'sounddevice', 'cv2', 'numpy', 'sqlite3', 'win32api', 'ctypes', 'wintypes'],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    noarchive=False,
    optimize=0,
)
pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.datas,
    [],
    name='ExamGuard',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=False,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)
