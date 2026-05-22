import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
    maxAge: 8 * 60 * 60, // 8 ชั่วโมง (เหมาะกับเวลาราชการ 1 วัน)
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) {
          throw new Error("กรุณากรอกชื่อผู้ใช้และรหัสผ่าน");
        }

        const user = await prisma.user.findUnique({
          where: { username: credentials.username.toLowerCase() },
        });

        if (!user) {
          throw new Error("ไม่พบบัญชีผู้ใช้นี้");
        }

        if (!user.active) {
          throw new Error("บัญชีของคุณถูกระงับ กรุณาติดต่อผู้ดูแลระบบ");
        }

        const isValid = await bcrypt.compare(
          credentials.password,
          user.passwordHash
        );

        if (!isValid) {
          throw new Error("รหัสผ่านไม่ถูกต้อง");
        }

        // คืนข้อมูลที่จะใส่ลงใน JWT
        return {
          id: String(user.id),
          name: user.fullName,
          email: user.email ?? "",
          username: user.username,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      // ครั้งแรกที่ login → เก็บ role/username ลง token
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
        token.username = (user as any).username;
      }
      return token;
    },
    async session({ session, token }) {
      // ส่งข้อมูลเพิ่มเติมจาก token ไปยัง client
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).role = token.role;
        (session.user as any).username = token.username;
      }
      return session;
    },
  },
};
