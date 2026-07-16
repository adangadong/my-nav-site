export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const { password, data } = await request.json();

    // 1. 安全验证
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

    // 2. 核心兼容处理：确保我们存入 KV 的永远是标准的 {"groups": [...]} JSON 字符串
    let finalData = "";
    if (data && data.groups) {
      finalData = JSON.stringify(data);
    } else if (Array.isArray(data)) {
      finalData = JSON.stringify({ groups: data });
    } else {
      finalData = JSON.stringify({ groups: [] });
    }

    // 写入数据库
    await env.NAV_DB.put("USER_LINKS_DATA", finalData);

    return new Response(JSON.stringify({ success: true, message: "同步成功！" }), {
      headers: { "Content-Type": "application/json" }
    });

  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: err.message }), { 
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
