import { getChatGPTUser } from "@/app/chatgpt-auth";
import {
  createSessionToken,
  routeError,
  sessionCookieName,
  sessionMaxAgeSeconds,
  workspaceIdForEmail,
} from "../_lib";

export async function GET(request: Request) {
  try {
    const user = await getChatGPTUser();
    const isDevelopment = typeof process === "undefined" || process.env.NODE_ENV !== "production";
    const fallbackEmail = isDevelopment && typeof process !== "undefined" ? process.env.FEEDBACKOS_DEV_USER_EMAIL ?? "" : "";
    const fallbackName = typeof process !== "undefined" ? process.env.FEEDBACKOS_DEV_USER_NAME ?? "Local operator" : "Local operator";
    const sessionUser = user ?? (fallbackEmail ? { email: fallbackEmail, displayName: fallbackName } : null);

    if (!sessionUser) {
      return Response.json(
        { error: "authentication_required", message: "Use ChatGPT sign-in or configure a development operator email." },
        { status: 401 },
      );
    }

    const token = await createSessionToken(sessionUser);
    const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
    return new Response(
      JSON.stringify({
        user: { displayName: sessionUser.displayName, email: sessionUser.email },
        workspaceId: await workspaceIdForEmail(sessionUser.email),
      }),
      {
        status: 200,
        headers: {
          "content-type": "application/json",
          "cache-control": "private, no-store",
          "set-cookie": `${sessionCookieName}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${sessionMaxAgeSeconds}${secure}`,
        },
      },
    );
  } catch (error) {
    const { body, status } = routeError(error);
    return Response.json(body, { status });
  }
}
