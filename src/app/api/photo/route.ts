import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { head } from "@vercel/blob";

// GET /api/photo?url=<blob_url>
// ตรวจสิทธิ์แล้ว redirect ไปที่ signed downloadUrl ของ Vercel Blob private
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const blobUrl = req.nextUrl.searchParams.get("url");
  if (!blobUrl) {
    return new NextResponse("Missing url parameter", { status: 400 });
  }

  // ป้องกัน SSRF — อนุญาตเฉพาะ Vercel Blob URL (รวม .private. subdomain)
  if (!blobUrl.includes(".blob.vercel-storage.com")) {
    return new NextResponse("Invalid URL", { status: 400 });
  }

  try {
    const blobMeta = await head(blobUrl);
    // redirect ไปที่ signed URL แทนการ proxy เนื้อหา
    return NextResponse.redirect(blobMeta.downloadUrl, 302);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("Photo proxy error:", msg);
    // ส่ง error จริงกลับเพื่อ debug
    return new NextResponse(`head() failed: ${msg}`, { status: 500 });
  }
}
