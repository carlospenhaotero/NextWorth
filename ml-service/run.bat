@echo off
cd /d "%~dp0"
echo Starting ML Service...
call venv\Scripts\activate
python app.py
pause
