export function isSystemAdminEmail(email: string | null | undefined) {
  if (!email) return false;
  const configured = (process.env.ADMIN_EMAILS || "litakiel@gmail.com")
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
  return configured.includes(email.toLowerCase());
}
