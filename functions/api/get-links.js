export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const privatePassword = url.searchParams.get('private_pwd');

  // 从 CF KV 中读取原始数据
  const rawData = await env.NAV_DB.get("USER_LINKS_DATA");
  if (!rawData) {
    // 如果数据库是空的，返回初始默认数据
    return new Response(JSON.stringify({ groups: [] }), { headers: { "Content-Type": "application/json" } });
  }

  let parsedData = JSON.parse(rawData);

  // 隐私过滤逻辑：检查私密分组密码
  const isPrivateVerified = await verifyPrivatePassword(privatePassword, env.PRIVATE_GROUP_PASSWORD_HASH);

  if (!isPrivateVerified) {
    // 如果密码不正确，过滤掉所有标记为 private: true 的分组，保障隐私安全性
    parsedData.groups = parsedData.groups.map(group => {
      if (group.isPrivate) {
        return { ...group, links: [], isLocked: true }; // 只返回空壳和锁定状态
      }
      return group;
    });
  }

  return new Response(JSON.stringify(parsedData), {
    headers: { "Content-Type": "application/json" }
  });
}

// 内部密码校验辅助函数
async function verifyPrivatePassword(pwd, serverHash) {
  if (!pwd || !serverHash) return false;
  const encoder = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(pwd));
  const clientHash = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
  return clientHash === serverHash;
}
