import { NextRequest, NextResponse } from "next/server";
import { PracticeSession } from "@/lib/storage";
import { getSession, saveSession, clearSession } from "@/lib/serverStorage";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const session = await getSession(id);
  return NextResponse.json({ session });
}

export async function PUT(request: NextRequest, { params }: Ctx) {
  const { id } = await params;
  let session: PracticeSession;
  try {
    session = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  await saveSession(id, session);
  return NextResponse.json({ ok: true });
}

export async function DELETE(_: NextRequest, { params }: Ctx) {
  const { id } = await params;
  await clearSession(id);
  return NextResponse.json({ ok: true });
}
