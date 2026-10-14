Set WshShell = CreateObject("WScript.Shell")
If WScript.Arguments.Count > 0 Then
  WshShell.Run "powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File ""C:\Users\omar\.gemini\antigravity\scratch\mobil-uygulama\pc-bridge\start-bridge.ps1"" -ShowPopup", 0, False
Else
  WshShell.Run "powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File ""C:\Users\omar\.gemini\antigravity\scratch\mobil-uygulama\pc-bridge\start-bridge.ps1""", 0, False
End If
