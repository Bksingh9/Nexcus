export function makeId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Math.random().toString(36).slice(2)}`;
}

export function parseJson<T>(value: string, fallback: T): T {
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export function stringifyJson(value: unknown) {
  return JSON.stringify(value ?? null);
}

const SCOPE_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]{1,79}$/;
const SESSION_COOKIE = "feedbackos_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 8;
const MAX_JSON_BODY_BYTES = 256 * 1024;
const requestCounters = new Map<string, { count: number; resetAt: number }>();

type SessionPayload = {
  email: string;
  displayName: string;
  workspaceId: string;
  role: "owner";
  exp: number;
};

export class RequestPayloadError extends Error {
  constructor(public readonly code: "payload_too_large" | "invalid_json") {
    super(code);
  }
}

export function sanitizeScopeValue(value: unknown) {
  if (typeof value !== "string") return "";
  const normalized = value.trim();
  return SCOPE_PATTERN.test(normalized) ? normalized : "";
}

async function runtimeSecret(name: string) {
  try {
    const { env } = await import("cloudflare:workers");
    const value = env[name];
    if (typeof value === "string" && value) return value;
  } catch {
    // Local Node processes do not provide the workers module.
  }

  if (typeof process === "undefined") return "";
  if (name === "FEEDBACKOS_SESSION_SECRET") {
    return process.env.FEEDBACKOS_SESSION_SECRET ?? process.env.NEXTAUTH_SECRET ?? "";
  }
  return process.env[name] ?? "";
}

function bytesToBase64Url(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

function base64UrlToBytes(value: string) {
  const padded = value.replaceAll("-", "+").replaceAll("_", "/") + "===";
  const binary = atob(padded.slice(0, padded.length - (padded.length % 4)));
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

async function hmac(secret: string, value: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
  return { key, signature: await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value)) };
}

export async function workspaceIdForEmail(email: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(email.toLowerCase()));
  return `ws-${Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("").slice(0, 24)}`;
}

export async function publicApiKeyForWorkspace(workspaceId: string) {
  const secret = await runtimeSecret("FEEDBACKOS_SESSION_SECRET");
  if (secret.length < 32) throw new Error("FEEDBACKOS_SESSION_SECRET is not configured.");
  const { signature } = await hmac(secret, `public-client:${workspaceId}`);
  return `pk_${bytesToBase64Url(new Uint8Array(signature))}`;
}

export async function requirePublicClientKey(request: Request, workspaceId: string) {
  const supplied = request.headers.get("x-api-key")?.trim() ?? "";
  if (!supplied) return Response.json({ error: "public_key_required" }, { status: 401 });
  if (supplied !== (await publicApiKeyForWorkspace(workspaceId))) {
    return Response.json({ error: "public_key_invalid" }, { status: 403 });
  }
  return null;
}

export async function createSessionToken(user: { email: string; displayName: string }) {
  const secret = await runtimeSecret("FEEDBACKOS_SESSION_SECRET");
  if (secret.length < 32) throw new Error("FEEDBACKOS_SESSION_SECRET is not configured.");
  const payload: SessionPayload = {
    email: user.email,
    displayName: user.displayName,
    workspaceId: await workspaceIdForEmail(user.email),
    role: "owner",
    exp: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE_SECONDS,
  };
  const encodedPayload = bytesToBase64Url(new TextEncoder().encode(JSON.stringify(payload)));
  const { signature } = await hmac(secret, encodedPayload);
  return `${encodedPayload}.${bytesToBase64Url(new Uint8Array(signature))}`;
}

function cookieValue(request: Request, name: string) {
  const cookies = request.headers.get("cookie")?.split(";") ?? [];
  const value = cookies.find((cookie) => cookie.trim().startsWith(`${name}=`));
  if (!value) return "";
  try {
    return decodeURIComponent(value.trim().slice(name.length + 1));
  } catch {
    return "";
  }
}

async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const [encodedPayload, encodedSignature] = token.split(".");
    if (!encodedPayload || !encodedSignature) return null;
    const secret = await runtimeSecret("FEEDBACKOS_SESSION_SECRET");
    if (secret.length < 32) return null;
    const { key } = await hmac(secret, encodedPayload);
    const valid = await crypto.subtle.verify(
      "HMAC",
      key,
      base64UrlToBytes(encodedSignature),
      new TextEncoder().encode(encodedPayload),
    );
    if (!valid) return null;
    const payload = JSON.parse(new TextDecoder().decode(base64UrlToBytes(encodedPayload))) as SessionPayload;
    if (
      typeof payload.email !== "string" ||
      typeof payload.displayName !== "string" ||
      !sanitizeScopeValue(payload.workspaceId) ||
      payload.role !== "owner" ||
      !Number.isFinite(payload.exp) ||
      payload.exp <= Math.floor(Date.now() / 1000)
    ) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

export async function getWorkspacePrincipal(request: Request) {
  const session = await verifySessionToken(cookieValue(request, SESSION_COOKIE));
  return session;
}

export async function requireWorkspaceScope(request: Request) {
  const url = new URL(request.url);
  const requestedWorkspaceId = sanitizeScopeValue(
    request.headers.get("x-feedbackos-workspace-id") ??
      request.headers.get("x-workspace-id") ??
      url.searchParams.get("workspaceId"),
  );
  const principal = await getWorkspacePrincipal(request);

  if (!principal) {
    return {
      response: Response.json(
        {
          error: "authentication_required",
          message: "Sign in before accessing workspace data.",
        },
        { status: 401 },
      ),
    };
  }

  if (requestedWorkspaceId && requestedWorkspaceId !== principal.workspaceId) {
    return {
      response: Response.json(
        { error: "workspace_forbidden", message: "The requested workspace is not assigned to this session." },
        { status: 403 },
      ),
    };
  }

  return { workspaceId: principal.workspaceId, principal };
}

export const sessionCookieName = SESSION_COOKIE;
export const sessionMaxAgeSeconds = SESSION_MAX_AGE_SECONDS;

export function rateLimit(request: Request, bucket: string, limit: number, windowMs = 60_000) {
  const now = Date.now();
  const address = request.headers.get("cf-connecting-ip") ?? "shared";
  const key = `${bucket}:${address}`;
  const current = requestCounters.get(key);
  if (!current || current.resetAt <= now) {
    requestCounters.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfter: 0 };
  }
  current.count += 1;
  return {
    allowed: current.count <= limit,
    retryAfter: Math.max(1, Math.ceil((current.resetAt - now) / 1000)),
  };
}

export function routeError(error: unknown) {
  if (error instanceof RequestPayloadError) {
    return {
      status: error.code === "payload_too_large" ? 413 : 400,
      body: { error: error.code, message: error.code === "payload_too_large" ? "Request body is too large." : "Request body must be valid JSON." },
    };
  }
  const message = error instanceof Error ? error.message : "Unexpected error";
  const detail =
    error instanceof Error && error.cause instanceof Error ? error.cause.message : "";
  const combined = `${message}\n${detail}`;

  if (combined.includes("DATABASE_URL is not configured") || combined.includes("Cloudflare D1 binding `DB` is unavailable")) {
    return {
      status: 503,
      body: {
        error: "database_unavailable",
        message: "The API database is not configured in this environment.",
      },
    };
  }

  if (combined.includes("no such table")) {
    return {
      status: 503,
      body: {
        error: "migration_required",
        message:
          "Database tables are missing. Run `pnpm db:generate` and apply the generated migration before using this API.",
      },
    };
  }

  if (combined.includes("FEEDBACKOS_SESSION_SECRET is not configured")) {
    return {
      status: 503,
      body: { error: "session_secret_missing", message: "Server authentication is not configured." },
    };
  }

  return { status: 500, body: { error: "server_error", message } };
}

export async function readJsonObject(request: Request, maxBytes = MAX_JSON_BODY_BYTES) {
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > maxBytes) throw new RequestPayloadError("payload_too_large");

  try {
    const raw = await request.arrayBuffer();
    if (raw.byteLength > maxBytes) throw new RequestPayloadError("payload_too_large");
    const body = JSON.parse(new TextDecoder().decode(raw)) as unknown;
    return body && typeof body === "object" && !Array.isArray(body)
      ? (body as Record<string, unknown>)
      : {};
  } catch (error) {
    if (error instanceof RequestPayloadError) throw error;
    throw new RequestPayloadError("invalid_json");
  }
}

export function textValue(value: unknown, fallback = "") {
  return typeof value === "string" ? value.trim() : fallback;
}

export function stringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}
