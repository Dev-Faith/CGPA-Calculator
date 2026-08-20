import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function POST(req: Request) {
  try {
    const text = await req.text();
    const filePath = path.join(process.cwd(), "scratch_docx_dump.txt");
    fs.writeFileSync(filePath, text);
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ success: false });
  }
}
