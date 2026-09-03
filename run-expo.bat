@echo off
title Astrolegia — Expo Go (QR)
echo ========================================================
echo   Iniciando Expo Go para Astrolegia (Escanear QR)
echo ========================================================
echo.

where pnpm >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    set PKG_MGR=npx pnpm
) else (
    set PKG_MGR=pnpm
)

echo Navegando a apps/client y arrancando Expo Go en puerto 8081...
cd apps\client
call %PKG_MGR% start

pause
