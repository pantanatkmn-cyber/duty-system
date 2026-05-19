# ระบบตรวจการเข้าเวร — วิทยาลัยเทคโนโลยีสันตพล

ระบบตรวจการเข้าเวรของครูประจำวัน พัฒนาด้วย Next.js 14 + TypeScript + TailwindCSS + Prisma + SQLite

## 📁 โครงสร้างโปรเจกต์

```
duty-system/
├── prisma/
│   ├── schema.prisma      ← schema ฐานข้อมูล
│   └── seed.ts            ← ข้อมูลตั้งต้น (admin, ประเภทเวร)
├── public/
│   └── uploads/           ← ที่เก็บรูปถ่ายเช็กอิน/รายงานเหตุการณ์
├── src/
│   ├── app/
│   │   ├── api/auth/[...nextauth]/route.ts   ← NextAuth handler
│   │   ├── login/page.tsx                     ← หน้า login
│   │   ├── dashboard/page.tsx                 ← หน้าหลักหลัง login
│   │   ├── admin/page.tsx                     ← หน้า admin (placeholder)
│   │   ├── chief/page.tsx                     ← หน้าหัวหน้าเวร (placeholder)
│   │   ├── globals.css                        ← Tailwind + ธีมสีสันตพล
│   │   ├── layout.tsx                         ← root layout + font ไทย
│   │   └── providers.tsx                      ← SessionProvider
│   ├── lib/
│   │   ├── auth.ts        ← NextAuth config
│   │   └── prisma.ts      ← Prisma client singleton
│   ├── types/
│   │   └── next-auth.d.ts ← ขยาย Session type
│   └── middleware.ts      ← ตรวจสิทธิ์ route
├── .env                   ← ตัวแปร environment (ห้าม commit)
├── .env.example           ← ตัวอย่าง env
├── package.json
├── tailwind.config.ts     ← ธีมสีสันตพล (เทา/ขาว/ส้ม)
└── tsconfig.json
```

## 🚀 วิธีติดตั้งและรัน (ครั้งแรก)

> **Prerequisite**: ติดตั้ง [Node.js 20+](https://nodejs.org/) แล้ว

### 1. ติดตั้ง dependencies

```bash
cd duty-system
npm install
```

### 2. สร้างฐานข้อมูล + ใส่ข้อมูลตั้งต้น

```bash
npx prisma generate    # generate Prisma Client
npm run db:push        # สร้างไฟล์ dev.db ตาม schema
npm run db:seed        # ใส่ admin + ครูตัวอย่าง + ประเภทเวร
```

### 3. รัน development server

```bash
npm run dev
```

เปิดเบราว์เซอร์ไปที่ <http://localhost:3000>

## 👥 บัญชีทดสอบ (จาก seed)

| Role | Username | Password |
|------|----------|----------|
| ADMIN | `admin` | `admin123` |
| TEACHER | `teacher1` ถึง `teacher5` | `password123` |

> ⚠️ ตอนนี้ยังไม่มีบัญชี CHIEF เพราะ chief จะถูกกำหนดผ่านระบบ "หัวหน้าเวรประจำวัน" ใน Phase 4
> สำหรับการทดสอบ middleware สามารถเปลี่ยน role ของ user ในฐานข้อมูลผ่าน Prisma Studio ได้

## 🛠️ คำสั่งที่มีประโยชน์

```bash
npm run dev           # รัน dev server
npm run build         # build production
npm run db:studio     # เปิด Prisma Studio (GUI ดู/แก้ข้อมูลในฐาน)
npm run db:reset      # ลบฐานและสร้างใหม่ + seed (ระวัง! ข้อมูลหาย)
```

## 🎨 ธีมสี

ใช้สีประจำวิทยาลัยเทคโนโลยีสันตพล: **เทา · ขาว · ส้ม**

ใน Tailwind สามารถใช้ class ได้ทั้ง `bg-brand-orange-500`, `text-brand-gray-700` ฯลฯ
ดูพาเลตทั้งหมดที่ `tailwind.config.ts`

## 📋 ความคืบหน้า

- [x] **Phase 1**: Setup โปรเจกต์ + DB schema + Auth ← **อยู่ตรงนี้**
- [ ] Phase 2: หน้า dashboard ครู (นาฬิกา + เวรของฉัน + เช็กอินถ่ายรูป)
- [ ] Phase 3: หน้าหัวหน้าเวร (สรุปรายงานประจำวัน + ปริ้น)
- [ ] Phase 4: หน้า admin (จัดการผู้ใช้/เวร/สถิติ)
- [ ] Phase 5: รายงานเหตุการณ์ผิดปกติ + อัปโหลดรูป
- [ ] Phase 6: Deploy บน server วิทยาลัย

## 🔄 การย้ายไป production

ตอนย้ายขึ้น server วิทยาลัย:

1. เปลี่ยน `provider` ใน `prisma/schema.prisma` จาก `sqlite` เป็น `postgresql` หรือ `mysql`
2. เปลี่ยน `DATABASE_URL` ใน `.env` เป็น connection string ของฐานใหม่
3. รัน `npx prisma db push` หรือ `prisma migrate deploy`
4. เปลี่ยน `NEXTAUTH_SECRET` เป็นค่า random ยาว ๆ (ใช้ `openssl rand -base64 32`)
5. เปลี่ยน `NEXTAUTH_URL` เป็น URL จริง
6. หาก server ไม่มี filesystem ถาวร ให้ย้าย `UPLOAD_DIR` ไปใช้ object storage (S3 / MinIO)

> ออกแบบไว้ให้ย้ายง่าย: เส้นทางรูปทั้งหมดเก็บใน DB เป็น relative path
> เปลี่ยนแค่ที่ฟังก์ชัน upload เดียวก็เปลี่ยน storage backend ได้
