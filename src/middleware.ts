// Middleware ตรวจสิทธิ์การเข้าถึงแต่ละ route ตาม role
// - /login                       → ทุกคนเข้าได้ (รีไดเร็คถ้า login แล้ว)
// - /dashboard                   → ต้อง login (ทุก role)
// - /admin/**                    → เฉพาะ ADMIN
// - /chief/**                    → ADMIN หรือ CHIEF
// - /api/auth/**                 → ปล่อยผ่าน (NextAuth จัดการเอง)

import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl;
    const role = req.nextauth.token?.role;

    // เส้นทาง admin
    if (pathname.startsWith("/admin") && role !== "ADMIN") {
      return NextResponse.redirect(new URL("/dashboard?error=forbidden", req.url));
    }

    // เส้นทาง chief (admin เข้าได้ด้วย)
    if (pathname.startsWith("/chief") && role !== "ADMIN" && role !== "CHIEF") {
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
