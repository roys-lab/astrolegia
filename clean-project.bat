@echo off
title Astrolegia — Limpieza, Build y Seed
echo ========================================================
echo   Astrolegia: Install, Build, Migrate, Reset DB y Seed
echo ========================================================
echo.

where pnpm >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    set PKG_MGR=npx pnpm
) else (
    set PKG_MGR=pnpm
)

echo [1/5] Instalando dependencias del monorepo...
call %PKG_MGR% install
if %ERRORLEVEL% NEQ 0 (
    echo Error al instalar dependencias.
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo [2/5] Generando cliente tipado de Prisma...
call %PKG_MGR% --filter @astrolegia/database generate
if %ERRORLEVEL% NEQ 0 (
    echo Error generando cliente de Prisma.
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo [3/5] Compilando paquetes del monorepo...
call %PKG_MGR% build
if %ERRORLEVEL% NEQ 0 (
    echo Error durante la compilacion.
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo [4/5] Reseteando y aplicando esquema en PostgreSQL...
call %PKG_MGR% --filter @astrolegia/database push --force-reset
if %ERRORLEVEL% NEQ 0 (
    echo Error al aplicar esquema en la base de datos.
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo [5/5] Ejecutando seed (super-admins: roy@royslab.com y santos.dlc@gmail.com)...
call %PKG_MGR% --filter @astrolegia/database seed
if %ERRORLEVEL% NEQ 0 (
    echo Error al ejecutar seed.
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo ========================================================
echo   Proyecto inicializado, compilado y con seed exitoso!
echo ========================================================
echo.
pause
