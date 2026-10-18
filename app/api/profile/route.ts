import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

const ALLOWED_CURRENCIES = ["EUR"];

// ─── PATCH: Name und Standardwährung speichern ──────────────────────────────

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  try {
    const body = (await req.json()) as { name?: unknown; currency?: unknown };
    const data: { name?: string; currency?: string } = {};

    if (body.name !== undefined) {
      if (typeof body.name !== "string") {
        return NextResponse.json({ error: "Ungültiger Name." }, { status: 400 });
      }
      const name = body.name.trim();
      if (name.length > 100) {
        return NextResponse.json({ error: "Name ist zu lang." }, { status: 400 });
      }
      data.name = name;
    }

    if (body.currency !== undefined) {
      if (
        typeof body.currency !== "string" ||
        !ALLOWED_CURRENCIES.includes(body.currency)
      ) {
        return NextResponse.json(
          { error: "Unbekannte Währung." },
          { status: 400 }
        );
      }
      data.currency = body.currency;
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json(
        { error: "Keine Änderungen übergeben." },
        { status: 400 }
      );
    }

    const user = await db.user.update({
      where: { id: session.user.id },
      data,
      select: { name: true, currency: true },
    });

    return NextResponse.json({ success: true, user });
  } catch (error) {
    console.error("Profil speichern fehlgeschlagen:", error);
    return NextResponse.json(
      { error: "Profil konnte nicht gespeichert werden." },
      { status: 500 }
    );
  }
}

// ─── DELETE: eigenes Konto endgültig löschen ────────────────────────────────

export async function DELETE(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  try {
    const body = (await req.json().catch(() => ({}))) as {
      password?: unknown;
      confirm?: unknown;
    };

    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, password: true },
    });
    if (!user) {
      return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    }

    if (user.password) {
      if (
        typeof body.password !== "string" ||
        !(await bcrypt.compare(body.password, user.password))
      ) {
        return NextResponse.json(
          { error: "Das Passwort ist falsch. Das Konto wurde nicht gelöscht." },
          { status: 400 }
        );
      }
    } else if (body.confirm !== "LÖSCHEN") {
      // SSO-Konten haben kein Passwort; die Bestätigung erfolgt wörtlich.
      return NextResponse.json(
        { error: 'Bitte "LÖSCHEN" zur Bestätigung eingeben.' },
        { status: 400 }
      );
    }

    // Kaskadiert über Portfolio auf Holdings/Trades; Accounts, Sessions und
    // Benachrichtigungen hängen ebenfalls am Benutzer.
    await db.user.delete({ where: { id: user.id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Kontolöschung fehlgeschlagen:", error);
    return NextResponse.json(
      { error: "Konto konnte nicht gelöscht werden." },
      { status: 500 }
    );
  }
}
