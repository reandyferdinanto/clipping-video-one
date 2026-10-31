@echo off
echo ========================================================
echo  Launching Smart Auto-Clipper Studio for Konten.com
echo ========================================================
start "Auto-Clipper Backend" cmd /c "%~dp0start_backend.bat"
start "Auto-Clipper Frontend" cmd /c "%~dp0start_frontend.bat"

echo.
echo Studio services launched:
echo  - Backend API: http://localhost:8000/docs
echo  - Frontend Web: http://localhost:3000
echo.
