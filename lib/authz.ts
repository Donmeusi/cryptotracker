import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

// Zentrale Admin-Prüfung für System-Endpunkte (Update, DB-Konfiguration, OIDC).
// Die Freigabe erfolgt über ADMIN_EMAILS (kommagetrennt). Ist die Variable
// nicht gesetzt, sind die System-Endpunkte bewusst gesperrt (fail closed).

export type AdminUser = {
  id: string;
  email: string;
};

export type AdminCheck =
  | { status: 200; user: AdminUser }
  | { status: 401 }
  | { status: 403 };

export function adminEmails(): string[] {
  return (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  return adminEmails().includes(email.toLowerCase());
}

/**
 * Prüft Sitzung, Admin-Freigabe und ob der Benutzer noch existiert.
 * Ein JWT kann auf einen gelöschten Benutzer zeigen.
 */
export async function getAdminSession(): Promise<AdminCheck> {
  const session = await auth();
  if (!session?.user?.id) return { status: 401 };

  if (!isAdminEmail(session.user.email)) return { status: 403 };

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, email: true },
  });
  if (!user) return { status: 401 };

  return { status: 200, user };
}

export function adminErrorResponse(status: 401 | 403) {
  return {
    error: status === 403 ? "Nur für Administratoren." : "Nicht autorisiert",
  };
}
