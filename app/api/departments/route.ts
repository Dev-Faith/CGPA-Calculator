import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isAdminSession } from "@/lib/session";

export async function GET() {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const departments = await db.department.findMany({
      orderBy: { name: "asc" },
    });
    return NextResponse.json({ departments });
  } catch (error) {
    console.error("[GET /api/departments]", error);
    return NextResponse.json(
      { error: "Failed to fetch departments." },
      { status: 500 }
    );
  }
}
