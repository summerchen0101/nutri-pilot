export const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

/** 結帳 popup 以 JSON 取 form payload，避開 Supabase 託管 HTML sandbox */
export function wantsJsonResponse(req: Request, url: URL): boolean {
  if (url.searchParams.get("format") === "json") return true;
  const accept = req.headers.get("Accept") ?? "";
  return accept.includes("application/json");
}

export function jsonResponse(
  body: unknown,
  status = 200,
  extraHeaders?: Record<string, string>,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
      ...extraHeaders,
    },
  });
}

export function corsHtmlResponse(body: string, status = 200): Response {
  return new Response(body, {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "text/html; charset=utf-8",
    },
  });
}

export function corsRedirect(location: string, status = 302): Response {
  return new Response(null, {
    status,
    headers: { ...corsHeaders, Location: location },
  });
}

export function corsTextResponse(body: string, status: number): Response {
  return new Response(body, {
    status,
    headers: { ...corsHeaders, "Content-Type": "text/plain" },
  });
}
