import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    const { phone, message } = await request.json();

    const idInstance = process.env.GREEN_API_INSTANCE_ID;
    const apiToken = process.env.GREEN_API_TOKEN;

    const url = `https://api.green-api.com/waInstance${idInstance}/sendMessage/${apiToken}`;

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chatId: `${phone}@c.us`, // Example: 918590814463
        message,
      }),
    });

    const data = await res.json();

    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message });
  }
}
