@echo off
set "FFMPEG_WINGET=%LOCALAPPDATA%\Microsoft\WinGet\Packages\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\ffmpeg-9.0.2-full_build\bin"
if exist "%FFMPEG_WINGET%" set "PATH=%FFMPEG_WINGET%;%PATH%"

cd /d "%~dp0backend"
echo ========================================================
echo  Starting FastAPI Backend on http://localhost:8000
echo ========================================================
.\venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8000
pause
