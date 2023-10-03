const fs = require("fs-extra");

/**
 * 转换请求
 * @param {*} url 请求的的资源，包含查询字符串的 /src/main.js
 * @param {*} server
 */
async function transformRequest(url, server) {
  // resolveId 获取 /src/main.js的绝对路径
  // 这里获取插件容器，可以直接使用plugin
  const { pluginContainer } = server;

  // 此处其实是调用lib\plugins\resolve.js里的resolveId方法返回绝对路径
  // 绝对路径/vite/src/main.js
  const { id } = await pluginContainer.resolveId(url);

  // load //读取/src/main.js的内容
  const loadResult = await pluginContainer.load(id);

  // 如果容器的load方法返回结果，就用返回的结果，否则就读硬盘上的文件
  let code;
  if (loadResult) {
    code = loadResult.code;
  } else {
    let fsPath = id.split("?")[0];
    code = await fs.readFile(fsPath, "utf-8");
  }

  // 提供模块ID到模块节点的映射
  await server.moduleGraph.ensureEntryFromUrl(url);

  /**
   * transform / 转换 / src / main.js的内容 把vue => vue.js
   */
  const result = pluginContainer.transform(code, id);

  return result;
}

module.exports = transformRequest;
