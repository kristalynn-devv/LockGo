# LockGo — Git Workflow

รีโมต: https://github.com/kristalynn-devv/LockGo.git  
สายหลัก: `master`  
งานแต่ละบล็อก commit แยก ข้อความโฟกัสที่เหตุผล ไม่ใส่ AI trailer

## ที่ขึ้นมาแล้ว

| Commit | บล็อก | ทำไม |
|--------|-------|------|
| `f199940` | เอกสาร | ล็อกข้อกำหนดก่อนมีโค้ด |
| `cab5e6f` | A | ให้สองแอปขึ้นรันได้ |
| `5fc65e8` | B | กันจองซ้อนที่ฐานข้อมูล |
| `4da6693` | C | เปิดเส้น Find & Reserve |
| `fd3ec18` | D | พิสูจน์ยิงพร้อมกัน |
| `8a89b40` | E | ประวัติและยกเลิก |
| `b7f8505` | F | เดิน journey บนเว็บ |
| `7548304` | G | เทสต์ตัวกรองและกฎช่องว่าง |
| `082deb8` | H | โชว์ workflow / prompt / review |

ห้าม commit `.env`, `TASKS.md`, `NOTES.md`

## Pull request

งานส่งมอบ (Swagger, README, CI) อยู่บนสาขา `chore/handoff` แล้วเปิด PR เข้า `master` เพื่อให้ GitHub Actions รันเทสต์ตาม Bonus 4

ผู้ตรวจเห็นร่องรอย: commit ย่อยบน `master` + PR ที่ CI วิ่ง + workflow นี้อธิบายว่าทำไมไม่ squash ทั้งโปรเจกต์เป็น commit เดียว
