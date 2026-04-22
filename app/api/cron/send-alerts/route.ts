import { NextResponse } from "next/server";
import { sendDueAlerts } from "@/lib/alerts";

function assertCronSecret(req: Request): boolean {
  const auth = req.headers.get("authorization");
  return auth === `Bearer ${process.env.CRON_SECRET}`;
}

export async function GET(req: Request) {
  if (!assertCronSecret(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await sendDueAlerts();
  return NextResponse.json({ ok: true, ...result });
}
