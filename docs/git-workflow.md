# LockGo — Git Workflow

รีโมต: https://github.com/kristalynn-devv/LockGo.git  
สายหลัก: `master`  
งานแต่ละบล็อก commit แยก ข้อความโฟกัสที่เหตุผล ไม่ใส่ AI trailer

## ที่ขึ้นมาแล้ว

| Commit | บล็อก | ทำไม |
|--------|-------|------|
| `c1157cd` | เอกสาร | ล็อกข้อกำหนดก่อนมีโค้ด |
| `71d5b48` | A | ให้สองแอปขึ้นรันได้ |
| `b5d403f` | B | กันจองซ้อนที่ฐานข้อมูล |
| `c870337` | C | เปิดเส้น Find & Reserve |
| `0781b35` | D | พิสูจน์ยิงพร้อมกัน |
| `6002da8` | E | ประวัติและยกเลิก |
| `b5a9e10` | F — UI | ทำหน้า Find / Detail / Reserve / Confirm / History |
| `50148b8` | G | เทสต์ตัวกรองและกฎช่องว่าง |
| `ee0c43f` | H | โชว์ workflow / prompt / review |

ห้าม commit `.env`, `TASKS.md`, `NOTES.md`

## Pull request

งานส่งมอบ (Swagger, README, CI) อยู่บนสาขา `chore/handoff` แล้วเปิด PR เข้า `master` เพื่อให้ GitHub Actions รันเทสต์ตาม Bonus 4

ผู้ตรวจเห็นร่องรอย: commit ย่อยบน `master` + PR ที่ CI วิ่ง + workflow นี้อธิบายว่าทำไมไม่ squash ทั้งโปรเจกต์เป็น commit เดียว
