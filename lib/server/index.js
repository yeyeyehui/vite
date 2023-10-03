// 责任链模式实现中间件
const connect = require("connect");

const resolveConfig = require("../config");

const serveStaticMiddleware = require("./middlewares/static");

const { createOptimizeDepsRun } = require("../esbuildContainer");

const transformMiddleware = require("./middlewares/transform");

const { createPluginContainer } = require("./pluginContainer");

// 监听文件变化
const chokidar = require("chokidar");

const path = require("path");

const { normalizePath } = require("../utils");

const { createWebSocketServer } = require("./ws");

const { handleHMRUpdate } = require("./hmr");

const { ModuleGraph } = require("./moduleGraph");

/**
 * 创建server服务
 * @returns
 */
async function createServer() {
  const config = await resolveConfig();

  // 创建链式调用，中间件的方式
  const middlewares = connect();

  const httpServer = require("http").createServer(middlewares);

  const ws = createWebSocketServer(httpServer, config);

  /**
   * 监听当前项目所有文件变化
   */
  const watcher = chokidar.watch(path.resolve(config.root), {
    ignored: ["**/node_modules/**", "**/.git/**"], // 忽略文件
  });

  /**
   * 提供模块ID到模块节点的映射
   */
  const moduleGraph = new ModuleGraph((url) => pluginContainer.resolveId(url));

  const pluginContainer = await createPluginContainer(config);

  const server = {
    pluginContainer,
    ws,
    watcher,
    moduleGraph,
    /**
     * 开启服务，提供外部调用
     * 在项目启动前进行依赖的预构建，预编译
     * 根据index.html找到所有依赖，如果是第三方依赖就会生成缓存配置和缓存文件到node_modules
     * 如果不是第三方就正常走
     * 找到本项目依赖的第三方模块进行文件的缓存
     */
    async listen(port, callback) {
      await runOptimize(config, server);

      // 开启服务
      httpServer.listen(port, callback);
    },
  };

  // 监听文件变化，拿到最新的文件
  watcher.on("change", async (file) => {
    const normalizeFile = normalizePath(file);

    await handleHMRUpdate(normalizeFile, server);
  });

  /**
   * 执行插件的configureServer修改server配置
   */
  for (const plugin of config.plugins) {
    if (plugin.configureServer) plugin.configureServer(server);
  }

  // main.js中 form vue=> form /node_modules/.vite/deps/vue.js?v=8406a619'
  middlewares.use(transformMiddleware(server));

  middlewares.use(serveStaticMiddleware(config));

  return server;
}

/**
 * 分析项目依赖的第三方模块，创建依赖的缓存目录进行优化
 */
async function runOptimize(config, server) {
  const optimizeDeps = await createOptimizeDepsRun(config);

  // 此时把第三方模块和预编译 后的文件关联关系保存在metadata中，也保存在了_optimizeDepsMetadata
  // 方便后面重写依赖的导入路径，走缓存路径
  server._optimizeDepsMetadata = optimizeDeps.metadata;
}

exports.createServer = createServer;
