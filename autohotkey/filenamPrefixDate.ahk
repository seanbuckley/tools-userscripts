; filenamPrefixDate.ahk 1.0.0 (AutoHotkey v2)
#Requires AutoHotkey v2.0
#SingleInstance Force

; Explorer: Ctrl+Alt+D prefixes the selected files/folders with today's date (yyyy-MM-dd_).
#HotIf WinActive("ahk_class CabinetWClass")
^!d:: PrefixSelectedWithDate()
#HotIf

PrefixSelectedWithDate() {
    static IID_IShellBrowser := "{000214E2-0000-0000-C000-000000000046}"
    hwnd := WinExist("A")
    activeTab := 0
    try activeTab := ControlGetHwnd("ShellTabWindowClass1", "ahk_id " hwnd)

    prefix := FormatTime(, "yyyy-MM-dd") "_"
    for window in ComObject("Shell.Application").Windows {
        if (window.HWND != hwnd)
            continue
        if activeTab {
            ; Windows 11 tabs: only act on the tab that's showing
            shellBrowser := ComObjQuery(window, IID_IShellBrowser, IID_IShellBrowser)
            ComCall(3, shellBrowser, "ptr*", &thisTab := 0)
            if (thisTab != activeTab)
                continue
        }
        for item in window.Document.SelectedItems {
            SplitPath(item.Path, &name, &dir)
            if (SubStr(name, 1, StrLen(prefix)) = prefix)
                continue
            try {
                if item.IsFolder
                    DirMove(item.Path, dir "\" prefix name)
                else
                    FileMove(item.Path, dir "\" prefix name)
            } catch as e
                MsgBox("Couldn't rename " name "`n" e.Message)
        }
        return
    }
}
