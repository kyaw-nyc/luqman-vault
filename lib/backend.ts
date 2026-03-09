// Server-side only. Never import this from a client component.
export const BACKEND_URL =
  process.env.BACKEND_URL ?? "http://127.0.0.1:3001";
