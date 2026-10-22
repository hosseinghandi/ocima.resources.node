export const DEFAULT_PASSWORD = "12345678";
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 64;

// Letters, digits and a few common symbols; no spaces, accents or control characters.
const allowedPattern = /^[A-Za-z0-9!@#$%&*_.\-?]+$/;

export const passwordRules =
  "Almeno 8 caratteri: solo lettere, numeri e i simboli ! @ # $ % & * _ - . ?";

export function validateNewPassword(password: string): string | null {
  if (password.length < PASSWORD_MIN_LENGTH) {
    return "La password deve contenere almeno 8 caratteri.";
  }
  if (password.length > PASSWORD_MAX_LENGTH) {
    return "La password può contenere al massimo 64 caratteri.";
  }
  if (!allowedPattern.test(password)) {
    return "La password può contenere solo lettere, numeri e i simboli ! @ # $ % & * _ - . ?";
  }
  if (password === DEFAULT_PASSWORD) {
    return "Scegli una password diversa da quella iniziale.";
  }
  return null;
}
