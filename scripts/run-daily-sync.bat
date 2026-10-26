@echo off
setlocal
set "PATH=C:\Program Files\nodejs;%PATH%"
cd /d "%~dp0\.."
echo ======================================================================
echo  ROTAZUR - GUNLUK CANLI FIYAT VE HAVA DURUMU SENKRONIZASYONU
echo  Tarih: %DATE% %TIME%
echo ======================================================================

if not exist data mkdir data

node scripts\daily-sync.mjs >> data\sync.log 2>&1

set "syncExit=%errorlevel%"
echo [%DATE% %TIME%] Sync exit code: %syncExit% >> data\sync.log
exit /b %syncExit%
