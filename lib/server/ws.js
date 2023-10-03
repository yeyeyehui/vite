const { WebSocketServer } = require("ws");

/**
 * 创建eWebSocket服务，用于监听，主动发送消息给客户端，取消监听等操作
 * @param {*} httpServer http服务
 * @returns 
 */
function createWebSocketServer(httpServer) {
  //websocket服务器可以和http服务器共享地址和端口。
  const webSocketServer = new WebSocketServer({ noServer: true });

  // 客户端发消息：当HTTP服务器接收到客户端发出的升级协议请求的时候
  httpServer.on("upgrade", (req, client, head) => {
    //Sec-WebSocket-Protocol: vite-hmr
    if (req.headers["sec-websocket-protocol"] === "vite-hmr") {
      //服务端处理：把通信 协议从HTTP协议升级成websocket协议
      webSocketServer.handleUpgrade(req, client, head, (client) => {
        webSocketServer.emit("connection", client, req); //连接成功
      });
    }
  });

  //监听到connection变化，当服务器监听到客户端的连接 请求成功的时候
  webSocketServer.on("connection", (client) => {
    // 给客户端发消息
    client.send(JSON.stringify({ type: "connected" }));
  });

  return {
    // 通过on方法可以监听客户端发过来的请求
    on: webSocketServer.on.bind(webSocketServer),

    // 取消监听客户端发过来的请求
    off: webSocketServer.off.bind(webSocketServer),

    // 调用此方法可以向所有的客户端发送消息
    send(payload) {
      const stringified = JSON.stringify(payload);

      // 拿到所有的客户端，给每一个客户端发消息
      webSocketServer.clients.forEach((client) => {
        //服务器向所有的客户端进行广播
        client.send(stringified);
      });
    },
  };
}

exports.createWebSocketServer = createWebSocketServer;
