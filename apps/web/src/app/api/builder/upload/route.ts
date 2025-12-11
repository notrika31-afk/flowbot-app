import { NextResponse } from "next/server";
import { writeFile } from "fs/promises";
import path from "path";

export async function POST(req: Request) {
  const form = await req.formData();
  const files = form.getAll("files") as File[];

  const uploaded: any[] = [];

  for (const file of files) {
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const filePath = path.join(process.cwd(), "public", "uploads", file.name);

    await writeFile(filePath, buffer);

    uploaded.push({
      name: file.name,
      url: "/uploads/" + file.name,
      type: file.type,
    });
  }

  return NextResponse.json({
    success: true,
    files: uploaded,
  });
}