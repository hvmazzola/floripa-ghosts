@echo off
setlocal
cd /d "%~dp0"

where py >nul 2>nul
if %errorlevel%==0 (
  start "" http://localhost:4173
  py -3 -m http.server 4173
  goto :end
)

where python >nul 2>nul
if %errorlevel%==0 (
  start "" http://localhost:4173
  python -m http.server 4173
  goto :end
)

echo.
echo Python nao foi encontrado neste computador.
echo Instale o Python pelo site python.org e execute este arquivo novamente.
pause

:end
endlocal
