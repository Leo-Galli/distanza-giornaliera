@echo off
rem ============================================================================
rem  Distanza giornaliera -> Android e iPhone, tramite Expo Go (gratis, nessun Mac richiesto)
rem
rem  start.bat            modalita LAN (predefinita): telefono e PC sulla STESSA Wi-Fi
rem  start.bat tunnel     funziona anche su reti diverse (piu lento, serve internet)
rem  start.bat help       mostra questo testo
rem
rem  Installa l'app "Expo Go" dal Play Store (Android) o dall'App Store (iPhone).
rem  Su iPhone, Expo Go richiede un account Expo gratuito (https://expo.dev/signup):
rem  accedi qui sotto con lo stesso account anche dentro l'app Expo Go.
rem  Su Android NON serve nessun account.
rem ============================================================================
setlocal EnableDelayedExpansion
cd /d "%~dp0"
title Distanza giornaliera

set MODE=
for %%A in (%*) do set MODE=%%A
if /i "%MODE%"=="help" goto help
if /i "%MODE%"=="-h" goto help
if /i "%MODE%"=="--help" goto help
if /i "%MODE%"=="/?" goto help
if not "%MODE%"=="" if /i not "%MODE%"=="tunnel" if /i not "%MODE%"=="lan" (
  echo [ERROR] Opzione sconosciuta "%MODE%". Usa: tunnel, lan oppure help.
  goto fail
)

where node >nul 2>&1
if errorlevel 1 (
  echo [ERROR] Node.js non trovato. Installa Node 20.19+ ^(LTS^) da https://nodejs.org e riprova.
  goto fail
)
node scripts\check-node.js
if errorlevel 1 goto fail

if not exist "node_modules\expo" (
  echo [1/2] Installazione delle dipendenze, la prima volta richiede qualche minuto...
  call npm install
  if errorlevel 1 (
    echo [ERROR] npm install fallito. Controlla la connessione a internet e riprova.
    goto fail
  )
)

rem ---- Expo Go su iPhone richiede lo stesso account Expo nel terminale e nell'app (Android non ne ha bisogno)
call npx expo whoami >nul 2>&1
if errorlevel 1 (
  echo.
  echo ================================================================
  echo  Se userai un iPhone: Expo Go richiede un account Expo.
  echo  Non ne hai uno? Creane uno gratis su https://expo.dev/signup
  echo  Su Android puoi ignorare questo passaggio e premere Invio.
  echo ================================================================
  call npx expo login
)

set PORT=8081
for /f "delims=" %%P in ('node scripts\free-port.js 8081') do set PORT=%%P

if /i "%MODE%"=="tunnel" goto start_tunnel

rem ---- Modalita LAN: l'IP dell'adattatore che raggiunge davvero il router (ignora VPN/WSL/VirtualBox)
set LANIP=
for /f "usebackq delims=" %%I in (`powershell -NoProfile -Command "(Get-NetIPConfiguration | Where-Object { $_.IPv4DefaultGateway -ne $null -and $_.NetAdapter.Status -eq 'Up' } | Select-Object -First 1).IPv4Address.IPAddress"`) do set LANIP=%%I
if defined LANIP set REACT_NATIVE_PACKAGER_HOSTNAME=%LANIP%

echo.
echo ================================================================
echo  1. Il telefono e il PC devono essere sulla STESSA rete Wi-Fi.
echo  2. Installa "Expo Go" dal Play Store (Android) o App Store (iPhone).
echo     Su iPhone accedi con lo stesso account Expo usato qui sopra.
echo  3. Inquadra il QR code qui sotto:
echo       - Android: apri Expo Go e scansiona il QR dall'app.
echo       - iPhone:  apri l'app Fotocamera e inquadra il QR.
if defined LANIP echo     Se la scansione non funziona: apri Expo Go e digita  exp://%LANIP%:!PORT!
echo  4. Tieni questa finestra aperta mentre usi l'app. Ctrl+C per fermare.
echo.
echo  Non si carica? Il firewall di Windows deve permettere a Node.js le
echo  reti PRIVATE ^(accetta il popup la prima volta^), oppure prova:
echo      start.bat tunnel
echo ================================================================
echo.
call npx expo start --lan --clear --port !PORT!
goto end

:start_tunnel
if not exist "node_modules\@expo\ngrok" (
  echo [2/2] Installazione del tunnel ^(@expo/ngrok^)...
  call npm install --save-dev @expo/ngrok
  if errorlevel 1 (
    echo [ERROR] Impossibile installare il tunnel. Usa la modalita LAN:  start.bat
    goto fail
  )
)
echo.
echo ================================================================
echo  Modalita TUNNEL: funziona su qualunque rete, ma puo richiedere fino
echo  a un minuto per connettersi ^(attendi "Tunnel ready"^). Se resta
echo  bloccato, premi Ctrl+C e usa la modalita LAN predefinita:  start.bat
echo ================================================================
echo.
call npx expo start --tunnel --clear --port !PORT!
goto end

:help
echo.
echo  start.bat            modalita LAN: telefono e PC sulla stessa Wi-Fi
echo  start.bat tunnel     funziona anche su reti diverse
echo  start.bat help       questo testo
echo.
endlocal
exit /b 0

:fail
echo.
echo Interrotto.
endlocal
pause
exit /b 1

:end
endlocal
