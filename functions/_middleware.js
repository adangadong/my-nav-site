// 全局中间件：为所有 API 请求添加基本的安全响应头
export const onRequest = async (context) => {
  const response = await context.next();
  
  // 设置响应头，防止别人通过 iframe 嵌套你的网站，并允许安全的 API 交互
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Content-Type", "application/json;charset=utf-8");
  
  return response;
};
