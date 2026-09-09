import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isAdminSession } from "@/lib/session";

export async function GET() {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const sessions = await db.session.findMany({
      orderBy: { label: "desc" },
    });
    return NextResponse.json({ sessions });
  } catch (error) {
    console.error("[GET /api/sessions]", error);
    return NextResponse.json(
      { error: "Failed to fetch sessions." },
      { status: 500 }
    );
  }
}
