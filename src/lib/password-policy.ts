// Shared by browser validation and the server. No network/password lookup service.
export const MIN_PASSWORD_LENGTH = 10;
export const MAX_PASSWORD_LENGTH = 1024;

const COMMON = new Set([
  "1234567890", "0987654321", "0123456789", "qwertyuiop", "iloveyou123", "welcome123",
  "password123", "password1234", "password12345", "sifre12345", "parola12345", "changeme123",
  "passwordpassword", "password123456789", "password12345678", "password1234567890",
  "123456789012345", "1234567890123456", "12345678901234567890",
  "qwertyuiopasdfgh", "qwertyuiopasdfghjkl", "abcdefghijklmnopqrstuvwxyz",
  "correcthorsebatterystaple", "sifremiunutmusum", "benimsifrem12345", "rotaplanlayicisi",
]);

export function passwordPolicyError(value: unknown): string | null {
  if (typeof value !== "string" || value.length > MAX_PASSWORD_LENGTH || Array.from(value).length < MIN_PASSWORD_LENGTH) {
    return `Şifreniz en az ${MIN_PASSWORD_LENGTH}, en fazla ${MAX_PASSWORD_LENGTH} karakter olmalıdır.`;
  }
  // Normalize only for blocklist comparison. Hashing/login keep the exact password.
  const comparable = value.normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase().replace(/ı/g, "i").replace(/[\s._-]/g, "");
  if (!comparable || COMMON.has(comparable) || /^([\s\S])\1+$/.test(comparable)
    || /^(password|qwerty|sifre|parola|rotazur|admin|letmein)(?:\1|[0-9!@#$%^&*])+$/i.test(comparable)) {
    return "Bu şifre çok yaygın veya kolay tahmin ediliyor. Daha özgün bir şifre cümlesi seçin.";
  }
  return null;
}
