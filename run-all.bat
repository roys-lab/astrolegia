@echo off
title Astrolegia — Todos los Servicios
echo ========================================================
echo   Astrolegia: Verificando Puertos y Levantando Stack
echo ========================================================
echo.

set PORT_BUSY=0

echo Comprobando disponibilidad de puertos estrictos...
netstat -ano | findstr ":3000" | findstr "LISTENING" >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo [ERROR FATAL] El puerto 3000 - API ya esta ocupado por otra aplicacion.
    set PORT_BUSY=1
)

netstat -ano | findstr ":3001" | findstr "LISTENING" >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo [ERROR FATAL] El puerto 3001 - Admin Web ya esta ocupado por otra aplicacion.
    set PORT_BUSY=1
)

netstat -ano | findstr ":3002" | findstr "LISTENING" >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo [ERROR FATAL] El puerto 3002 - Client Web ya esta ocupado por otra aplicacion.
    set PORT_BUSY=1
)

netstat -ano | findstr ":8081" | findstr "LISTENING" >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo [ERROR FATAL] El puerto 8081 - Expo Go Metro ya esta ocupado por otra aplicacion.
    set PORT_BUSY=1
)

if %PORT_BUSY% EQU 1 (
    echo.
    echo ========================================================
    echo   ABORTADO: Uno o mas puertos estan ocupados.
    echo   Por favor cierra los procesos en conflicto y reintenta.
    echo ========================================================
    echo.
    pause
    exit /b 1
)

echo [OK] Puertos 3000, 3001, 3002 y 8081 disponibles.
echo.

where pnpm >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    set PKG_MGR=npx pnpm
) else (
    set PKG_MGR=pnpm
)

echo [1/4] Levantando API Backend en http://localhost:3000 ...
start "Astrolegia API (:3000)" cmd /k "cd apps\api && %PKG_MGR% dev"

echo [2/4] Levantando Admin Web en http://localhost:3001 ...
start "Astrolegia Admin Web (:3001)" cmd /k "cd apps\admin && %PKG_MGR% dev"

echo [3/4] Levantando Client Web en http://localhost:3002 ...
start "Astrolegia Client Web (:3002)" cmd /k "cd apps\client && %PKG_MGR% web"

echo [4/4] Levantando Expo Go con QR en puerto 8081 ...
start "Astrolegia Expo Go (:8081 QR)" cmd /k "cd apps\client && %PKG_MGR% start"

echo.
echo ========================================================
echo   Los 4 servicios se estan ejecutando en simultaneo:
echo   - 1. Backend API:     http://localhost:3000
echo   - 2. Admin Web:       http://localhost:3001
echo   - 3. Client Web:      http://localhost:3002
echo   - 4. Expo Go (QR):    http://localhost:8081
echo ========================================================
echo.
pause
