import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { get } from "@vercel/blob";

// GET /api/photo?url=<blob_url>
// ตรวจสิทธิ์ login แล้วดึงรูปจาก private Vercel Blob ผ่าน SDK
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const blobUrl = req.nextUrl.searchParams.get("url");
  if (!blobUrl) {
    return new NextResponse("Missing url", { status: 400 });
  }

  // ป้องกัน SSRF — อนุญาตเฉพาะ Vercel Blob URL
  if (!blobUrl.includes(".blob.vercel-storage.com")) {
    return new NextResponse("Invalid URL", { status: 400 });
  }

  try {
    // ใช้ get() จาก SDK — จัดการ auth กับ private store ให้อัตโนมัติ
    const result = await get(blobUrl, { access: "private" });

    if (!result || result.statusCode !== 200) {
      return new NextResponse("Photo not found", { status: 404 });
    }

    return new NextResponse(result.stream, {
      headers: {
        "Content-Type": result.blob.contentType ?? "image/jpeg",
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("Photo proxy error:", msg);
    return new NextResponse(`Error: ${msg}`, { status: 500 });
  }
}
