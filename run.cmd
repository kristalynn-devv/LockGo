@echo off
setlocal
cd /d "%~dp0"

where pnpm >nul 2>&1
if errorlevel 1 (
  echo [LockGo] ไม่พบ pnpm — ติดตั้ง: npm install -g pnpm@11.5.1
  pause
  exit /b 1
)

if not exist ".env" (
  echo [LockGo] ไม่พบ .env
  echo  คัดลอก: copy .env.example .env แล้วเติมค่า Supabase / DATABASE_URL
  pause
  exit /b 1
)

echo [LockGo] กำลังปิดโปรเซสเก่าบนพอร์ต 3000 และ 5173...
call :free_port 3000
call :free_port 5173
timeout /t 1 /nobreak >nul

echo [LockGo] กำลังรัน dev — Web http://localhost:5173  API http://localhost:3000
pnpm dev
if errorlevel 1 pause
exit /b %errorlevel%

:free_port
for /f "tokens=5" %%P in ('netstat -ano ^| findstr /C:"LISTENING" ^| findstr /C:":%~1 "') do (
  if not "%%P"=="0" (
    echo  ปิด PID %%P ที่พอร์ต %~1
    taskkill /PID %%P /F /T >nul 2>&1
  )
)
goto :eof
