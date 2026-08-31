const KEY = "focus-entrena:admin-password";

export function getStoredPassword(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function setStoredPassword(password: string): void {
  try {
    localStorage.setItem(KEY, password);
  } catch {
    // localStorage puede fallar (modo privado, cuota, etc.) — no es crítico,
    // solo significa que va a pedir la contraseña de nuevo la próxima vez.
  }
}

export function clearStoredPassword(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // ver arriba
  }
}
