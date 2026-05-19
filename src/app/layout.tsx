import type { Metadata } from "next";
import { Sarabun } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const sarabun = Sarabun({
  subsets: ["thai", "latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-sarabun",
  display: "swap",
});

export const metadata: Metadata = {
  title: "ระบบตรวจการเข้าเวร | วิทยาลัยเทคโนโลยีสันตพล",
  description: "ระบบตรวจการเข้าเวรของครูประจำวัน",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="th" className={sarabun.variable}>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
