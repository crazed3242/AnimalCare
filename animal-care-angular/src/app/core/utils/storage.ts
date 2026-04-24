function isLocalStorageAvailable(): boolean {
  try {
    return typeof window !== 'undefined' && typeof localStorage !== 'undefined';
  } catch {
    return false;
  }
}

export function storageGet(key: string): string | null {
  if (isLocalStorageAvailable()) {
    return localStorage.getItem(key);
  }
  return null;
}

export function storageSet(key: string, value: string): void {
  if (isLocalStorageAvailable()) {
    localStorage.setItem(key, value);
  }
}

export function storageRemove(key: string): void {
  if (isLocalStorageAvailable()) {
    localStorage.removeItem(key);
  }
}
