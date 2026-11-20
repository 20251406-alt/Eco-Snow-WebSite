import { NextRequest } from "next/server";

const upstream =
  process.env.NODE_ENV !== "production" && process.env.REPORT_API_LOCAL_PORT
    ? "http://localhost:" + Number(process.env.REPORT_API_LOCAL_PORT)
    : "https://eco-snow-report-platform.vercel.app";
const publicReads = new Set(["config", "snapshot", "photo", "weather"]);
const writes = new Set(["auth", "auth/logout", "auth/refresh", "action"]);
const adminActions = new Set(["review", "policy", "reset_demo"]);

async function bridge(
  req: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  const path = (await context.params).path.join("/");
  const posting = req.method === "POST";
  if (!(posting ? writes : publicReads).has(path))
    return Response.json(
      { error: "지원하지 않는 요청입니다." },
      { status: 404 },
    );

  const headers = new Headers({
    Accept: path === "photo" ? "image/webp" : "application/json",
  });
  const cookies = req.cookies
    .getAll()
    .filter(({ name }) => name === "eco-access" || name === "eco-refresh");
  if (cookies.length)
    headers.set(
      "Cookie",
      cookies
        .map(({ name, value }) => name + "=" + encodeURIComponent(value))
        .join("; "),
    );
  let body: string | undefined;
  if (posting) {
    if (req.headers.get("origin") !== req.nextUrl.origin)
      return Response.json(
        { error: "요청 출처가 일치하지 않습니다." },
        { status: 403 },
      );
    try {
      body = await req.text();
      if (body.length > 10000)
        return Response.json({ error: "요청이 너무 깁니다." }, { status: 413 });
      const input = JSON.parse(body);
      if (
        (path === "auth" && input.mode !== "login") ||
        (path === "action" && !adminActions.has(input.action))
      )
        return Response.json(
          { error: "기관용 요청만 허용됩니다." },
          { status: 403 },
        );
    } catch {
      return Response.json(
        { error: "요청 형식이 잘못되었습니다." },
        { status: 400 },
      );
    }
    headers.set("Content-Type", "application/json");
    headers.set("Origin", upstream);
  }
  try {
    const result = await fetch(upstream + "/api/" + path + req.nextUrl.search, {
      method: req.method,
      headers,
      body,
      cache: "no-store",
      redirect: "manual",
      signal: AbortSignal.timeout(15000),
    });
    if (result.status >= 300 && result.status < 400)
      throw new Error("Unexpected API redirect");
    const outgoing = new Headers({
      "Cache-Control": "private, no-store",
      "Content-Type": result.headers.get("Content-Type") || "application/json",
      "X-Content-Type-Options": "nosniff",
    });
    if (path.startsWith("auth")) {
      for (const cookie of result.headers.getSetCookie()) {
        if (
          /^eco-(access|refresh)=/.test(cookie) &&
          !/;\s*domain=/i.test(cookie)
        )
          outgoing.append("Set-Cookie", cookie);
      }
    }
    return new Response(result.body, {
      status: result.status,
      headers: outgoing,
    });
  } catch {
    return Response.json(
      { error: "제보 서버에 연결하지 못했습니다. 다시 시도해 주세요." },
      { status: 503 },
    );
  }
}

export const GET = bridge;
export const POST = bridge;
