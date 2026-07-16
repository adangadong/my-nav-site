export async function onRequest(context) {
  // 临时直接放行所有请求，不拦截
  return await context.next();
}
