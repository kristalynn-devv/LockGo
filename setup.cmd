@echo off
setlocal
cd /d "%~dp0"

where pnpm >nul 2>&1
if errorlevel 1 (
  echo [LockGo] ไม่พบ pnpm — ติดตั้ง: npm install -g pnpm@11.5.1
  pause
  exit /b 1
)

echo [LockGo] ติดตั้ง dependencies...
pnpm install
if errorlevel 1 (
  echo [LockGo] pnpm install ล้มเหลว
  pause
  exit /b 1
)

if not exist ".env" (
  if not exist ".env.example" (
    echo [LockGo] ไม่พบ .env.example
    pause
    exit /b 1
  )
  copy /Y ".env.example" ".env" >nul
  echo [LockGo] สร้าง .env จาก .env.example แล้ว
  echo  เติมค่า Supabase / DATABASE_URL ใน .env ตาม README ข้อ 5-6
  echo  จากนั้นรัน setup.cmd อีกครั้งเพื่อ migrate และ seed
  pause
  exit /b 0
)

echo [LockGo] migrate ฐานข้อมูล...
pnpm db:migrate
if errorlevel 1 (
  echo [LockGo] db:migrate ล้มเหลว — ตรวจสอบ DATABASE_URL ใน .env
  pause
  exit /b 1
)

echo [LockGo] seed ข้อมูลทดสอบ...
pnpm db:seed
if errorlevel 1 (
  echo [LockGo] db:seed ล้มเหลว
  pause
  exit /b 1
)

echo.
echo [LockGo] setup เสร็จแล้ว — รัน run.cmd เพื่อเริ่ม dev server
pause
