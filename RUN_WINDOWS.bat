@echo off
setlocal
cd /d "%~dp0"
echo ==========================================
echo CiviTrak - Citizen / Authority / Contractor
ECHO ==========================================
start "CiviTrak Backend" cmd /k "cd /d "%~dp0Backend" && if not exist .venv\Scripts\python.exe python -m venv .venv && call .venv\Scripts\activate && pip install -r requirements.txt && python scripts\download_pothole_model.py && uvicorn main:app --reload"
start "CiviTrak Frontend" cmd /k "cd /d "%~dp0Frontend" && npm install && npm run dev"
echo Backend and frontend windows opened.
echo The first backend run will download the prototype pothole model when internet is available.
