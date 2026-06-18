$filePath = "d:\_DEV\_PDR\PDR-bot\app_final.js"
$text = Get-Content -Path $filePath -Encoding UTF8 -Raw
$cp1251 = [System.Text.Encoding]::GetEncoding("windows-1251")
$bytes = $cp1251.GetBytes($text)
$utf8 = [System.Text.Encoding]::UTF8
$restoredText = $utf8.GetString($bytes)
[System.IO.File]::WriteAllText($filePath, $restoredText, $utf8)
Write-Output "Done"
