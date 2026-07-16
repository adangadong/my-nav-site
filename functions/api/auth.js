export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const { password, type } = await request.json();
    
    // 决定是验证管理员密码，还是私密文件夹密码
    const targetHash = type === 'admin' ? env.ADMIN_PASSWORD_HASH : env.PRIVATE_GROUP_PASSWORD_HASH;

    if (!targetHash) {
      return new Response(JSON.stringify({ success: false, error: "服务器未配置密码环境变量" }), { status: 500 });
    }

    // SHA-256 加密算法
    const encoder = new TextEncoder();
    const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(password));
    const clientHash = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');

    if (clientHash === targetHash) {
      return new Response(JSON.stringify({ success: true, message: "验证通过" }));
    } else {
      return new Response(JSON.stringify({ success: false, error: "密码错误" }), { status: 401 });
    }

  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: err.message }), { status: 500 });
  }
}
