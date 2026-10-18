import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

const ALLOWED_CURRENCIES = ["EUR", "USD", "CHF", "GBP", "JPY"];

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
