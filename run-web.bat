@echo off
title Astrolegia - Web Next.js (:3003)
echo ========================================================
echo   Iniciando la web de consultantes (Next.js) en :3003
echo ========================================================
echo.

where pnpm >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    set PKG_MGR=npx pnpm
) else (
    set PKG_MGR=pnpm
)

echo Navegando a apps/web y arrancando Next.js en http://localhost:3003 ...
cd apps\web
call %PKG_MGR% dev

pause
