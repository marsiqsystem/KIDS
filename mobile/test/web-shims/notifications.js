// Test-only: push does not exist in a browser. Every call is a quiet no-op.
export const AndroidImportance = { HIGH: 4, MAX: 5 };
export const DEFAULT_ACTION_IDENTIFIER = "expo.modules.notifications.actions.DEFAULT";
export function setNotificationHandler() {}
export async function setNotificationChannelAsync() { return null; }
export async function getPermissionsAsync() { return { granted: false, canAskAgain: false }; }
export async function requestPermissionsAsync() { return { granted: false, canAskAgain: false }; }
export async function getDevicePushTokenAsync() { throw new Error("no push on web"); }
export function useLastNotificationResponse() { return null; }
