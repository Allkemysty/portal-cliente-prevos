import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  const webhook = process.env.N8N_PORTAL_WEBHOOK_URL;

  if (!token) {
    return NextResponse.json({ error: "Token ausente" }, { status: 400 });
  }

  if (!webhook) {
    return NextResponse.json({ error: "Integração ainda não configurada" }, { status: 503 });
  }

  try {
    const url = new URL(webhook);
    url.searchParams.set("token", token);

    const response = await fetch(url.toString(), {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });

    if (!response.ok) {
      return NextResponse.json({ error: "Cliente não encontrado" }, { status: response.status === 404 ? 404 : 502 });
    }

    const data = await response.json();
    return NextResponse.json(data, { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return NextResponse.json({ error: "Falha ao consultar o portal" }, { status: 502 });
  }
}
