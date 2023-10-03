const alias = {
  js: "application/javascript", //Content-Type
  css: "text/css",
  html: "text/html",
  json: "application/json",
};

/**
 * 修改请求头，把第三方依赖的路径转换为缓存地址路径
 */
function send(req, res, content, type) {
  res.setHeader("Content-Type", alias[type]);

  res.statusCode = 200;

  //写入响应并且结束响应
  return res.end(content);
}

module.exports = send;
