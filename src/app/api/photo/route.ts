import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// GET /api/photo?url=<blob_url>
// Proxy สำหรับ serve รูปจาก Vercel Blob (private store)
// ต้อง login ก่อนถึงดูรูปได้
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const blobUrl = req.nextUrl.searchParams.get("url");
  if (!blobUrl) {
    return new NextResponse("Missing url parameter", { status: 400 });
  }

  // ป้องกัน SSRF — อนุญาตเฉพาะ Vercel Blob URL เท่านั้น
  if (!blobUrl.match(/^https:\/\/[a-z0-9]+\.blob\.vercel-storage\.com\//)) {
    return new NextResponse("Invalid URL", { status: 400 });
  }

  try {
    const token = process.env.BLOB_READ_WRITE_TOKEN;
    const response = await fetch(blobUrl, {
      headers: token ? { authorization: `Bearer ${token}` } : {},
    });

    if (!response.ok) {
      return new NextResponse("Photo not found", { status: 404 });
    }

    const buffer = await response.arrayBuffer();
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": response.headers.get("Content-Type") ?? "image/jpeg",
        // cache ใน browser ได้สูงสุด 1 ชั่วโมง แต่ไม่ให้ CDN cache (private)
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch {
    return new NextResponse("Failed to fetch photo", { status: 500 });
  }
}
