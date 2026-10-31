@echo off
rem Starts Agent Studio and opens it in the browser. Close this window to stop the app.
title Agent Studio
cd /d "%~dp0"

if not exist node_modules (
  echo Installing packages...
  call npm install || goto failed
)

call npm run db:setup || goto failed

rem Open the browser once the servers have had a few seconds to start.
start "" /min cmd /c "timeout /t 5 >nul & start http://localhost:5180"
call npm run dev
exit /b 0

:failed
echo.
echo Agent Studio could not start. If the error is about the database, check DATABASE_URL in .env
pause
exit /b 1
