/**
 * 模块的依赖关系
 * 模块节点，代表一个模块
 */
class ModuleNode {
  //哪些模块导入的了自己  renderModule.js被 main.js导入
  importers = new Set();

  //我这个模块可以接收哪些模块的修改
  acceptedHmrDeps = new Set(); //exports中的一部分

  constructor(url, type = "js") {
    this.url = url;
    this.type = type;
  }
}

/**
 * 创建模块的依赖关系树状结构对象
 * 提供模块ID到模块节点的映射
 */
class ModuleGraph {
  constructor(resolveId) {
    // 存储获取文件绝对路径的方法
    this.resolveId = resolveId;
  }

  //模块ID和模块节点对象的映射关系
  // Map(4) {
  //   '/Users/yehui/Desktop/yehui/note/zf/webpack/21.vite50use/src/main.js' => ModuleNode {
  //     importers: Set(0) {},
  //     acceptedHmrDeps: Set(0) {},
  //     url: '/src/main.js',
  //     type: 'js'
  //   },
  //   '/Users/yehui/Desktop/yehui/note/zf/webpack/21.vite50use/src/mainbak.js' => ModuleNode {
  //     importers: Set(1) { [ModuleNode] },
  //     acceptedHmrDeps: Set(1) { [ModuleNode] },
  //     url: '/src/mainbak.js',
  //     type: 'js'
  //   },
  //   '/Users/yehui/Desktop/yehui/note/zf/webpack/21.vite50use/src/client.js' => ModuleNode {
  //     importers: Set(0) {},
  //     acceptedHmrDeps: Set(0) {},
  //     url: '/src/client.js',
  //     type: 'js'
  //   },
  //   '/Users/yehui/Desktop/yehui/note/zf/webpack/21.vite50use/src/renderModule.js' => ModuleNode {
  //     importers: Set(1) { [ModuleNode] },
  //     acceptedHmrDeps: Set(0) {},
  //     url: '/src/renderModule.js',
  //     type: 'js'
  //   }
  // }
  idToModuleMap = new Map();

  //根据模块ID返回模块的节点对象
  getModuleById(id) {
    return this.idToModuleMap.get(id);
  }

  // 所有需要请求的文件路径，一个路径一个文件模块对象
  // rawUrl: node_modules/20.vite50/deps/vue.js
  async ensureEntryFromUrl(rawUrl) {
    //先获得它的绝对路径
    // url: /node_modules/20.vite50/deps/vue.js
    // resolveId: /Users/yehui/Desktop/yehui/note/zf/webpack/21.vite50use/node_modules/20.vite50/deps/vue.js
    const [url, resolveId] = await this.resolveUrl(rawUrl);

    let moduleNode = this.idToModuleMap.get(resolveId);

    // 如果没有说明需要新建存储
    if (!moduleNode) {
      moduleNode = new ModuleNode(url);

      this.idToModuleMap.set(resolveId, moduleNode);
    }

    return moduleNode;
  }

  // 获取文件绝对路径
  async resolveUrl(url) {
    const resolved = await this.resolveId(url);

    return [url, resolved.id || resolved];
  }

  // 更新模块信息，这里进行建立模块之间的关系，importAnalysis插件使用
  async updateModuleInfo(importerModule, importedUrls, acceptedUrls) {
    //建立父子关系 让导入的模块imported Module，的importers包括importerModule
    for (const importedUrl of importedUrls) {
      const depModule = await this.ensureEntryFromUrl(importedUrl);
      //依赖的模块导入方是importerModule
      depModule.importers.add(importerModule); //让renderModule的importers里添加main.js
    }

    //维护接收的热更新依赖,
    const acceptedHmrDeps = importerModule.acceptedHmrDeps;
    for (const acceptedUrl of acceptedUrls) {
      //让main.js的acceptedHmrDeps里包括renderModule
      const acceptedModule = await this.ensureEntryFromUrl(acceptedUrl);

      acceptedHmrDeps.add(acceptedModule);
    }
  }
}

exports.ModuleGraph = ModuleGraph;
