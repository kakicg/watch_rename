@echo off

rem
rem 10秒後にNode.jsのファイルをPowershellで実行する
rem

pushd "C:\Users\Control\watch_rename"

timeout 10

start "app" "%SystemRoot%\system32\WindowsPowerShell\v1.0\powershell.exe" "node main.js"

exit