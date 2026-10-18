import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { isValidPassword } from "@/lib/password";

export const dynamic = "force-dynamic";

// ─── PATCH: Passwort ändern ─────────────────────────────────────────────────

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  try {
    const body = (await req.json()) as {
      currentPassword?: unknown;
      newPassword?: unknown;
    };

    if (
      typeof body.currentPassword !== "string" ||
      typeof body.newPassword !== "string"
    ) {
      return NextResponse.json(
        { error: "Aktuelles und neues Passwort sind erforderlich." },
        { status: 400 }
      );
    }

    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, password: true },
    });
    if (!user) {
      return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    }
    if (!user.password) {
      return NextResponse.json(
        {
          error:
            "Für dieses Konto ist kein Passwort hinterlegt (Anmeldung über SSO).",
        },
        { status: 400 }
      );
    }

    const currentMatches = await bcrypt.compare(
      body.currentPassword,
      user.password
    );
    if (!currentMatches) {
      return NextResponse.json(
        { error: "Das aktuelle Passwort ist falsch." },
        { status: 400 }
      );
    }

    const check = isValidPassword(body.newPassword);
    if (!check.valid) {
      return NextResponse.json({ error: check.reason }, { status: 400 });
    }

    if (body.newPassword === body.currentPassword) {
      return NextResponse.json(
        { error: "Das neue Passwort muss sich vom alten unterscheiden." },
        { status: 400 }
      );
    }

    const hashed = await bcrypt.hash(body.newPassword, 12);
    await db.user.update({
      where: { id: user.id },
      data: { password: hashed },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Passwortänderung fehlgeschlagen:", error);
    return NextResponse.json(
      { error: "Passwort konnte nicht geändert werden." },
      { status: 500 }
    );
  }
}
