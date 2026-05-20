// Middleware ตรวจสิทธิ์การเข้าถึงแต่ละ route ตาม role
// - /login                       → ทุกคนเข้าได้ (รีไดเร็คถ้า login แล้ว)
// - /dashboard                   → ต้อง login (ทุก role)
// - /admin/**                    → เฉพาะ ADMIN
// - /chief/**                    → ADMIN, CHIEF, หรือ TEACHER ที่เป็นหัวหน้าเวรวันนี้
//                                  (middleware ปล่อย TEACHER ผ่าน แล้วให้ page ตรวจสอบ DB เอง
//                                   เพราะ middleware ไม่สามารถ query DB ได้)
// - /api/auth/**                 → ปล่อยผ่าน (NextAuth จัดการเอง)

import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl;
    const role = req.nextauth.token?.role;

    // เส้นทาง admin — เฉพาะ ADMIN เท่านั้น
    if (pathname.startsWith("/admin") && role !== "ADMIN") {
      return NextResponse.redirect(new URL("/dashboard?error=forbidden", req.url));
    }

    // เส้นทาง chief — ADMIN และ CHIEF ผ่านได้เลย
    // TEACHER ปล่อยผ่านมาให้ page ตรวจสอบว่าเป็นหัวหน้าเวรวันนี้หรือไม่
    if (pathname.startsWith("/chief") && role !== "ADMIN" && role !== "CHIEF" && role !== "TEACHER") {
      return NextResponse.redirect(new URL("/dashboard?error=forbidden", req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      // คืน true = ต้อง authenticated; ถ้า false NextAuth จะเด้งไปหน้า /login
      authorized: ({ token }) => !!token,
    },
  }
);

// matcher: กำหนด route ที่จะให้ middleware ทำงาน
export const config = {
  matcher: [
    "/dashboard/:path*",
    "/teacher/:path*",
    "/admin/:path*",
    "/chief/:path*",
    "/api/teacher/:path*",
    "/api/admin/:path*",
    "/api/chief/:path*",
  ],
};
