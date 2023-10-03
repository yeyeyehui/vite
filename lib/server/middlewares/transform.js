const { isJSRequest } = require("../../utils");

const send = require("../send");

const transformRequest = require("../transformRequest");

/**
 * 把第三方依赖的路径换成缓存的依赖路径，在node_modules中的.vite文件依赖中的deps文件夹中
 */
function transformMiddleware(server) {
  return async function (req, res, next) {
    if (req.method !== "GET") return next();

    // 获取路径名 /src/main.js?id=1#top pathname=/src/main.js query={id:1}
    // let pathname = parse(req.url).pathname;
    // 如果请求的资源是JS的话，重写第三方模块的路径
    if (isJSRequest(req.url)) {
      // 此处传的一定是req.url,如果只传pathname会丢失query.
      // 而我们后面会写vue插件，会依赖查询参数
      // 这里进行内容的转换请求
      const result = await transformRequest(req.url, server);

      // 重载内容并且修改请求状态等参数
      if (result) return send(req, res, result.code, "js");
      else return next();

    } else return next();
  };
}

module.exports = transformMiddleware;
