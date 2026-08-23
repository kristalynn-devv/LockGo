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

echo [LockGo] กำลังรัน dev — Web http://localhost:5173  API http://localhost:3000
pnpm dev
if errorlevel 1 pause
