export async function onRequest(context) {
  // 临时直接放行，不校验密码，永远返回成功
  return new Response(JSON.stringify({ success: true, message: "Debug Mode: Auth Bypass" }), {
    headers: { "Content-Type": "application/json" },
  });
}
