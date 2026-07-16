export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const { password, data } = await request.json();

    // 1. 安全验证：将前端传来的密码进行 SHA-256 哈希，与环境变量中的密码对比
    const encoder = new TextEncoder();
    const passwordBuffer = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', passwordBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const clientHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    if (clientHash !== env.ADMIN_PASSWORD_HASH) {
      return new Response(JSON.stringify({ success: false, error: "密码错误，无权修改" }), {
        status: 401,
        headers: { "Content-Type": "application/json" }
      });
    }

    // 2. 验证通过，将新的数据存入 Cloudflare KV
    // data 包含：调整好顺序的文件夹、网站名字、链接等
    await env.NAV_DB.put("USER_LINKS_DATA", JSON.stringify(data));

    return new Response(JSON.stringify({ success: true, message: "同步成功！" }), {
      headers: { "Content-Type": "application/json" }
    });

  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: err.message }), { status: 500 });
  }
}
