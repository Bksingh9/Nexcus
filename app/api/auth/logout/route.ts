import { sessionCookieHeader } from "../../_lib";

export async function POST(request: Request) {
  return Response.json({ ok: true }, { headers: { "set-cookie": sessionCookieHeader(request, "", 0) } });
}
