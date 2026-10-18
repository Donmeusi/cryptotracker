// Admin-Freigabe ohne Abhängigkeit zu NextAuth, damit die Liste sowohl in
// der Authentifizierung (Session-Flag) als auch in den API-Routen genutzt
// werden kann.

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
