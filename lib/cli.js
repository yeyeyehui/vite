const { createServer } = require("./server");

(async function () {
  // 创建一个server对象
  const server = await createServer();

  // 启动服务
  server.listen(9998, () => console.log("服务器在 9998"));
})();
