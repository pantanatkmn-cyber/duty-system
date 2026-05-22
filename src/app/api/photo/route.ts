import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// GET /api/photo?url=<blob_url>
// ตรวจสิทธิ์ login แล้วดึงรูปจาก private Vercel Blob ส่งกลับให้ browser
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const blobUrl = req.nextUrl.searchParams.get("url");
  if (!blobUrl) {
    return new NextResponse("Missing url", { status: 400 });
  }

  // ป้องกัน SSRF — อนุญาตเฉพาะ Vercel Blob URL (รวม .private. subdomain)
  if (!blobUrl.includes(".blob.vercel-storage.com")) {
    return new NextResponse("Invalid URL", { status: 400 });
  }

  const token = process.env.BLOB_READ_WRITE_TOKEN;

  try {
    // ดึงรูปจาก private blob ด้วย Bearer token (Vercel รองรับวิธีนี้)
    const response = await fetch(blobUrl, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });

    if (!response.ok) {
      console.error(`Blob fetch failed: ${response.status} ${response.statusText} — ${blobUrl}`);
      return new NextResponse(`Blob fetch failed: ${response.status}`, { status: response.status });
    }

    const buffer = await response.arrayBuffer();
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": response.headers.get("Content-Type") ?? "image/jpeg",
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("Photo proxy error:", msg);
    return new NextResponse(`Error: ${msg}`, { status: 500 });
  }
}
