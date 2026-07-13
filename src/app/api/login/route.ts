import { createHash } from "crypto";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const password = process.env.APP_PASSWORD;
  if (!password) {
    return Response.json({ ok: true, note: "no password configured" });
  }
  const { password: attempt } = await req.json().catch(() => ({ password: "" }));
  if (typeof attempt !== "string" || attempt !== password) {
    return new Response(JSON.stringify({ error: "wrong password" }), {
      status: 401,
      headers: { "content-type": "application/json" },
    });
  }
  const token = createHash("sha256").update(`tuv-hub:${password}`).digest("hex");
  const proto =
    req.headers.get("x-forwarded-proto") ??
    new URL(req.url).protocol.replace(":", "");
  const secure = proto === "https" ? "; Secure" : "";
  return new Response(JSON.stringify({ ok: true }), {
    headers: {
      "content-type": "application/json",
      "set-cookie": `hub_auth=${token}; Path=/; HttpOnly${secure}; SameSite=Lax; Max-Age=${60 * 60 * 24 * 30}`,
    },
  });
}
