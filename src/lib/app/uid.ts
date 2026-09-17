/** "402118963" → "402 118 963" — how every screen prints a User ID. */
export function groupUid(uid: string): string {
  return uid.replace(/\D/g, "").replace(/(\d{3})(?=\d)/g, "$1 ");
}
