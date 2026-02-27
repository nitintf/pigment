import { LazyStore } from "@tauri-apps/plugin-store";

const store = new LazyStore("preferences.json");

export async function getPreference<T>(key: string, fallback: T): Promise<T> {
  const value = await store.get<T>(key);
  return value ?? fallback;
}

export async function setPreference<T>(key: string, value: T): Promise<void> {
  await store.set(key, value);
}
