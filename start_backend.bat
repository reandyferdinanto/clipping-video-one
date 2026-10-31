@echo off
cd /d "%~dp0backend"
echo ========================================================
echo  Starting FastAPI Backend on http://localhost:8000
echo ========================================================
.\venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8000
pause
