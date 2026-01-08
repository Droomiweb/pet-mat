import { NextResponse } from "next/server";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const imageUrl = searchParams.get("url");

  if (!imageUrl) {
    return NextResponse.json({ error: "No URL provided" }, { status: 400 });
  }

  try {
    const res = await fetch(imageUrl);
    if (!res.ok) throw new Error("Failed to fetch image from source");

    const contentType = res.headers.get("content-type");
    const buffer = await res.arrayBuffer();

    return new Response(buffer, {
      headers: {
        "Content-Type": contentType || "image/jpeg",
        "Content-Disposition": `attachment; filename="pet_offspring_prediction.jpg"`,
        "Cache-Control": "no-cache",
      },
    });
  } catch (error) {
    console.error("Proxy Download Error:", error);
    return NextResponse.json({ error: "Failed to download image" }, { status: 500 });
  }
}
