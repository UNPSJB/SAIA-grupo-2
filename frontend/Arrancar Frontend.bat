@echo off
cd /d "%~dp0"

echo Verificando dependencias...
call npm install
if errorlevel 1 goto error

echo Levantando frontend en http://localhost:5173
echo.
call npm run dev

:error
echo.
echo === El frontend se detuvo (codigo %ERRORLEVEL%) ===
pause