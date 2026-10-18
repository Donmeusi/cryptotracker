export function isValidPassword(password: string): {
  valid: boolean;
  reason?: string;
} {
  if (password.length < 8) {
    return { valid: false, reason: "Mindestens 8 Zeichen erforderlich." };
  }
  if (password.length > 200) {
    return { valid: false, reason: "Das Passwort ist zu lang (maximal 200 Zeichen)." };
  }
  if (!/[A-Z]/.test(password)) {
    return {
      valid: false,
      reason: "Mindestens ein Großbuchstabe erforderlich.",
    };
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, reason: "Mindestens eine Zahl erforderlich." };
  }
  return { valid: true };
}
