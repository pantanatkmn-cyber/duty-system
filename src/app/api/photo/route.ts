import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { head } from "@vercel/blob";

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
    // head() จะ return downloadUrl ที่เป็น signed URL สำหรับ private blob
    const blobMeta = await head(blobUrl);
    const response = await fetch(blobMeta.downloadUrl);

    if (!response.ok) {
      return new NextResponse("Photo not found", { status: 404 });
    }

    const buffer = await response.arrayBuffer();
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": response.headers.get("Content-Type") ?? "image/jpeg",
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (err) {
    console.error("Photo proxy error:", err);
    return new NextResponse("Failed to fetch photo", { status: 500 });
  }
}
