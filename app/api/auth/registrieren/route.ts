import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";

// ─── SEC-03: In-Memory Rate Limiter (no external dep needed) ─────────────────
// Stores { count, resetAt } per IP address
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const LIMIT = 5; // max attempts
const WINDOW_MS = 15 * 60 * 1000; // 15-minute window

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}

function checkRateLimit(ip: string): { allowed: boolean; retryAfterSeconds: number } {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now > entry.resetAt) {
    // Start fresh window
    rateLimitMap.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return { allowed: true, retryAfterSeconds: 0 };
  }

  if (entry.count >= LIMIT) {
    return { allowed: false, retryAfterSeconds: Math.ceil((entry.resetAt - now) / 1000) };
  }

  entry.count++;
  return { allowed: true, retryAfterSeconds: 0 };
}

// ─── SEC-04: Email validation regex ──────────────────────────────────────────
const EMAIL_REGEX = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;

function isValidEmail(email: string): boolean {
  return EMAIL_REGEX.test(email.trim());
}

function isValidPassword(password: string): { valid: boolean; reason?: string } {
  if (password.length < 8) return { valid: false, reason: "Mindestens 8 Zeichen erforderlich." };
  if (!/[A-Z]/.test(password)) return { valid: false, reason: "Mindestens ein Großbuchstabe erforderlich." };
  if (!/[0-9]/.test(password)) return { valid: false, reason: "Mindestens eine Zahl erforderlich." };
  return { valid: true };
}

// ─── Route Handler ────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  // SEC-06: CSRF Origin check
  const origin = req.headers.get("origin");
  const host = req.headers.get("host");
  if (origin && host && !origin.includes(host)) {
    return NextResponse.json({ error: "Ungültige Anfrage." }, { status: 403 });
  }

  // SEC-03: Rate limiting
  const ip = getClientIp(req);
  const { allowed, retryAfterSeconds } = checkRateLimit(ip);
  if (!allowed) {
    return NextResponse.json(
      { error: `Zu viele Versuche. Bitte warte ${Math.ceil(retryAfterSeconds / 60)} Minuten.` },
      {
        status: 429,
        headers: {
          "Retry-After": String(retryAfterSeconds),
          "X-RateLimit-Limit": String(LIMIT),
        },
      }
    );
  }

  try {
    const body = await req.json();
    const { name, email, password, currency } = body;

    // Input presence check
    if (!name?.trim() || !email?.trim() || !password) {
      return NextResponse.json(
        { error: "Name, E-Mail und Passwort sind erforderlich." },
        { status: 400 }
      );
    }

    // SEC-04: Email format validation
    if (!isValidEmail(email)) {
      return NextResponse.json(
        { error: "Bitte gib eine gültige E-Mail-Adresse ein." },
        { status: 400 }
      );
    }

    // Password strength check
    const pwCheck = isValidPassword(password);
    if (!pwCheck.valid) {
      return NextResponse.json({ error: pwCheck.reason }, { status: 400 });
    }

    // Name length check (prevent spam)
    if (name.trim().length > 100) {
      return NextResponse.json({ error: "Name ist zu lang." }, { status: 400 });
    }

    const existing = await db.user.findUnique({ where: { email: email.trim().toLowerCase() } });
    if (existing) {
      return NextResponse.json(
        { error: "Diese E-Mail-Adresse ist bereits registriert." },
        { status: 409 }
      );
    }

    // Hash with cost factor 12 (good balance security/perf)
    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await db.user.create({
      data: {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password: hashedPassword,
        currency: currency || "EUR",
        portfolios: {
          create: {
            name: "Mein Portfolio",
            description: "Standard-Portfolio",
          },
        },
      },
    });

    // Never return password hash or sensitive fields
    return NextResponse.json(
      { id: user.id, email: user.email, name: user.name },
      { status: 201 }
    );
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "Ein interner Fehler ist aufgetreten." },
      { status: 500 }
    );
  }
}
