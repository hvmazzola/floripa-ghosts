export type BrowserStorage = Pick<Storage, "getItem" | "setItem">;

export type StoredValue<T> = {
  value: T;
  recovered: boolean;
};

export function readStoredValue<T>(
  storage: BrowserStorage,
  key: string,
  isValid: (value: unknown) => value is T,
  fallback: T,
): StoredValue<T> {
  try {
    const rawValue = storage.getItem(key);
    if (!rawValue) return { value: fallback, recovered: false };

    const parsedValue: unknown = JSON.parse(rawValue);
    if (isValid(parsedValue)) return { value: parsedValue, recovered: false };
  } catch {
    // Cada chave é recuperada isoladamente para preservar os demais dados locais.
  }

  return { value: fallback, recovered: true };
}

export function readStoredText<T extends string>(
  storage: BrowserStorage,
  key: string,
  isValid: (value: string) => value is T,
  fallback: T,
): StoredValue<T> {
  try {
    const rawValue = storage.getItem(key);
    if (!rawValue) return { value: fallback, recovered: false };
    if (isValid(rawValue)) return { value: rawValue, recovered: false };

    const parsedValue: unknown = JSON.parse(rawValue);
    if (typeof parsedValue === "string" && isValid(parsedValue)) {
      return { value: parsedValue, recovered: false };
    }
  } catch {
    // Preferências legadas podem ter sido gravadas sem serialização JSON.
  }

  return { value: fallback, recovered: true };
}

export function writeStoredValue(storage: BrowserStorage, key: string, value: unknown) {
  try {
    storage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}
