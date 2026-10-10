// Test-only: expo-secure-store has no web build. localStorage stands in.
export async function getItemAsync(k) { return localStorage.getItem(k); }
export async function setItemAsync(k, v) { localStorage.setItem(k, v); }
export async function deleteItemAsync(k) { localStorage.removeItem(k); }
