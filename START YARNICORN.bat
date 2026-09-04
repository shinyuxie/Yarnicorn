@echo off
setlocal
title Yarnicorn Crochet Hub

cd /d "%~dp0"

echo.
echo   Yarnicorn Crochet Hub
echo   ---------------------
echo   Starting your crochet app...
echo.

where py >nul 2>nul
if %errorlevel%==0 (
    start "" http://localhost:8797
    py -m http.server 8797
    exit /b
)

where python >nul 2>nul
if %errorlevel%==0 (
    start "" http://localhost:8797
    python -m http.server 8797
    exit /b
)

echo Python was not found, so Yarnicorn will open in basic local mode.
echo.
start "" "%~dp0index.html"
timeout /t 3 >nul
