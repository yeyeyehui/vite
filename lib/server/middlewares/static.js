const static = require("serve-static");

// 静态服务中间件
// root: 当前进程所在的根目录
/**
 * 静态服务中间件
 * @param root 当前进程所在的根目录
 */
function serveStaticMiddleware({ root }) {
  return static(root);
}

module.exports = serveStaticMiddleware;
