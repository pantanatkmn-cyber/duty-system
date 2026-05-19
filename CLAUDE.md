# Project: ระบบตรวจการเข้าเวร - วิทยาลัยเทคโนโลยีสันตพล

> ไฟล์นี้เป็น context สำหรับ Claude Code อ่านอัตโนมัติเมื่อเปิดเซสชัน
> เพื่อให้รู้ว่าโปรเจกต์นี้คืออะไร ทำอะไรไปแล้ว และจะทำอะไรต่อ

## 👤 เกี่ยวกับผู้ใช้

- อาจารย์สอนระดับอาชีวศึกษา วิทยาลัยเทคโนโลยีสันตพล (อุดรธานี)
- สอนสาขาคอมพิวเตอร์เกมและแอนิเมชัน และเทคโนโลยีธุรกิจดิจิทัล
- มีทักษะเขียนโค้ดขั้นพื้นฐาน → อธิบายเป็นภาษาไทยที่เข้าใจง่าย ไม่ใช้ศัพท์เทคนิคเกินจำเป็น
- ตอบกลับเป็น **ภาษาไทย** เสมอ

## 🎯 ภาพรวมระบบ

ระบบตรวจการเข้าเวรของครูประจำวันในวิทยาลัย ใช้งานในวิทยาลัยจริงภายหลัง

### Stack
- Next.js 14 (App Router) + TypeScript
- TailwindCSS (ธีมสีสันตพล: เทา/ขาว/ส้ม)
- Prisma + SQLite (dev) → ภายหลังย้ายไป PostgreSQL/MySQL
- NextAuth.js (Credentials Provider, JWT session)
- bcryptjs, dayjs, zod

### 3 Roles
1. **ADMIN** — จัดการทุกอย่าง: ผู้ใช้ มอบหมายเวร แก้ไขข้อมูลเวร ดูสถิติ
2. **CHIEF** — หัวหน้าเวรประจำวัน: ดูสรุปรายงานเวรประจำวัน ปริ้นใบรายงาน ดูสถิติเหตุการณ์
3. **TEACHER** — ครูเวร: ดูเวรของตน เช็กอินถ่ายรูป รายงานเหตุการณ์ผิดปกติ

หมายเหตุสำคัญ:
- 1 คนรับเวรได้หลายเวรในวันเดียว
- **หัวหน้าเวร (CHIEF) admin กำหนดแยกต่างหาก** (ผ่าน `ChiefAssignment`) — ไม่ใช่ role ถาวร และหัวหน้าเวรก็มีเวรของตนในวันนั้นด้วย

### 3 ประเภทเวร
1. **เวรประตูหน้า** (FRONT_GATE) — 07:30-08:20 ต้อนรับนักศึกษา
2. **เวรประจำจุด** (POINT) — 4 จุด:
   - ประตูข้าง: 11:50-12:40
   - โรงอาหาร+ห้องน้ำหญิง+อาคาร 9 ปี: ภายใน 17:00
   - ห้องน้ำชาย+อาคาร 19 ปี: ภายใน 17:00
   - อาคาร 29 ปี: ภายใน 17:00
3. **เวรคาบ** (PERIOD) — 7 คาบ: คาบ 1-6 + คาบพักเที่ยง (11:50-12:40)

### กฎ business สำคัญ
- **บังคับใช้กล้องสด** ในการเช็กอิน (ป้องกันโกง — ไม่ให้เลือกจากคลังภาพ)
- **มีการสแตมป์เวลา** ลงบนรูปที่ถ่าย
- **เกณฑ์การมาสาย**: admin ตั้งค่า grace period ได้ผ่าน `SystemSetting` (default 5 นาที)
- **รายงานเหตุการณ์ผิดปกติ**: สูงสุด 5 เหตุการณ์ต่อ assignment พร้อมรูปประกอบ
- **วันทำการ**: จันทร์-ศุกร์ เท่านั้น
- ภาษาไทยทั้งหมด, ปฏิทินไทยพุทธศักราช

### Deployment
- ภายหลังย้ายไป server วิทยาลัย (ยังไม่แน่ใจสเปก)
- ออกแบบให้ย้ายง่าย: storage path เก็บใน DB เป็น relative string
- ย้าย DB จาก SQLite → PostgreSQL/MySQL ด้วย Prisma เพียงเปลี่ยน provider

## 📁 โครงสร้างปัจจุบัน

```
duty-system/
├── prisma/
│   ├── schema.prisma       # User, DutyType, DutyAssignment, ChiefAssignment,
│   │                        # CheckIn, IncidentReport, IncidentPhoto, SystemSetting
│   └── seed.ts             # admin/admin123, teacher1-5/password123, 12 duty types
├── src/
│   ├── app/
│   │   ├── api/auth/[...nextauth]/route.ts
│   │   ├── login/page.tsx
│   │   ├── dashboard/page.tsx + logout-button.tsx
│   │   ├── admin/page.tsx (placeholder)
│   │   ├── chief/page.tsx (placeholder)
│   │   ├── layout.tsx, providers.tsx, globals.css, page.tsx
│   ├── lib/
│   │   ├── auth.ts         # NextAuth config + Credentials provider
│   │   └── prisma.ts       # Prisma singleton
│   ├── types/next-auth.d.ts
│   └── middleware.ts       # role-based route guard
├── tailwind.config.ts      # brand.orange + brand.gray พาเลต
└── .env                    # DATABASE_URL, NEXTAUTH_SECRET
```

## 📋 แผน Phase

- [x] **Phase 1** — Setup + DB + Auth ✅ เสร็จแล้ว
- [ ] **Phase 2** — Dashboard ครู (นาฬิกา + เวรของฉัน + เช็กอินถ่ายรูป + สแตมป์เวลา) ← **ขั้นต่อไป**
- [ ] **Phase 3** — หน้าหัวหน้าเวร (สรุปรายงานประจำวัน + ปริ้นใบรายงาน + สถิติเหตุการณ์)
- [ ] **Phase 4** — หน้า admin (CRUD ผู้ใช้, มอบหมายเวร, กำหนดหัวหน้าเวร, ตั้งค่าผ่อนผัน, สถิติรายสัปดาห์/เดือน)
- [ ] **Phase 5** — รายงานเหตุการณ์ผิดปกติ (รายงาน + อัปโหลดรูป max 5)
- [ ] **Phase 6** — Deploy

## 🎨 ธีมและ Design System

ดูที่ `tailwind.config.ts` — มี `brand.orange` (50-900) และ `brand.gray` (50-900)
ใน `globals.css` มี component classes สำเร็จ:
- `.btn-primary` (ส้ม), `.btn-secondary` (เทา-ขาว)
- `.form-input`, `.card`
- `.badge-success/warning/danger/info/orange`

ฟอนต์: Sarabun (Google Fonts, รองรับไทย+ละติน)

## 🔑 บัญชีทดสอบ (จาก seed)

| Role | Username | Password |
|------|----------|----------|
| ADMIN | admin | admin123 |
| TEACHER | teacher1 ถึง teacher5 | password123 |

ยังไม่มี CHIEF ใน seed — CHIEF จะกำหนดผ่าน ChiefAssignment ใน Phase 4
ทดสอบสิทธิ์ CHIEF ได้โดยเปลี่ยน role ของ user ใน Prisma Studio (`npm run db:studio`)

## ⚠️ ข้อควรระวัง / Quirks ที่เจอแล้ว

1. **SQLite ไม่รองรับ enum** → ใช้ `String` แทนใน schema (เคย bug ครั้งหนึ่งเพราะลืมลบ enum declaration ทิ้ง)
2. **SQLite ไม่รองรับ array** → รูปหลายรูปต้องเก็บใน relation table (เช่น `IncidentPhoto` แทนที่จะเก็บ `String[]`)
3. **Photo upload** ใน Phase 5: ตอน dev เก็บที่ `public/uploads/` — ย้าย provider ภายหลังโดยแก้ที่เดียว (logic upload)
4. **กล้องสด** ต้องใช้ `navigator.mediaDevices.getUserMedia()` + `<canvas>` วาดสแตมป์เวลาทับรูปก่อนอัปโหลด (Phase 2)

## 💬 การทำงานกับอาจารย์

- ทำทีละ Phase ตามลำดับ — **ไม่ทำพร้อมกัน**
- ทุกครั้งจบ Phase ให้รอ feedback ก่อนไป Phase ถัดไป
- เขียน comment ในโค้ดเป็นภาษาไทย (อาจารย์มีทักษะ basic จะอ่าน-ปรับเองได้)
- ไม่ใช้ jargon เกินจำเป็น อธิบายขั้นตอนชัดเจน

## 🚀 คำสั่งที่ใช้บ่อย

```bash
npm run dev           # รัน dev server
npm run db:push       # sync schema → ฐาน
npm run db:seed       # ใส่ข้อมูลตั้งต้น
npm run db:studio     # GUI ดู/แก้ข้อมูล
npm run db:reset      # ล้างฐานและสร้างใหม่
```
