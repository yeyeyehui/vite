// es-module-lexer是一个 JS 模块语法解析器
const { init, parse } = require("es-module-lexer");

const path = require("path");

// magic-string是一个用来操作字符串的库
const MagicString = require("magic-string");

const { lexAcceptedHmrDeps } = require("../server/hmr");

// config: 执行命令的路径
function importAnalysis(config) {
  const { root } = config;

  let server;

  return {
    // 插件名称
    name: "importAnalysis",

    // 这里获取全局的插件，服务器等对象
    configureServer(_server) {
      // 贡献配置
      server = _server;
    },

    //处理模块 1.找文件 2读内容 3 转换内容
    //假如说我们转的是src/main.js source= main.js的原始内容
    //id就是此模块的绝对路径
    //1.找到源文件中第三方模块2.进行转换 vue=>deps/vue.js
    async transform(source, id) {
      //moduleId
      await init; //等待解析器初始化完成

      //获取导入的模块
      let imports = parse(source)[0];

      //如果没有导入任何模块，可以直接返回
      if (!imports.length) {
        return source;
      }

      // 编译过的文件信息
      const { moduleGraph } = server;

      //通过导入方的模块的路径获取模块的节点
      // id: /Users/yehui/Desktop/yehui/note/zf/webpack/21.vite50use/src/mainbak.js
      // ModuleNode {
      //   importers: Set(1) {
      //     ModuleNode { // mainbak文件被main文件使用过
      //       importers: Set(0) {},
      //       acceptedHmrDeps: Set(0) {},
      //       url: '/src/main.js',
      //       type: 'js'
      //     }
      //   },
      //   acceptedHmrDeps: Set(0) {},
      //   url: '/src/mainbak.js',
      //   type: 'js'
      // }
      const currentModule = moduleGraph.getModuleById(id); //main.js

      //此模块将要导入的子模块
      const importedUrls = new Set(); //renderModule.js

      //接收变更的依赖模块
      const acceptedUrls = new Set(); //renderModule.js

      const ms = new MagicString(source);

      //url= vue =>  /node_modules/.vite/deps/vue.js
      const normalizeUrl = async (url) => {
        //./renderModule.js
        //内部其实是调用插件容器的resolveId方法返回url的绝对路径
        //resolved=C:\aproject\webpack202208\vite50use\src\renderModule.js
        const resolved = await this.resolve(url, id);

        //
        if (resolved && resolved.id.startsWith(root)) {
          //C:/vite50use/src/main.js=>/src/main.js
          //C:/vite50use/node_modules/.vite50/deps/vue.js
          // /node_modules/.vite50/deps/vue.js
          url = resolved.id.slice(root.length); // /src/renderModule.js
        }

        //建立此导入的模块和模块节点的对应关系
        await moduleGraph.ensureEntryFromUrl(url);

        return url;
      };

      //重写路径,从终端找文件的绝对路径，并且存储路径和依赖文件路径
      for (let index = 0; index < imports.length; index++) {
        //n=specifier=vue
        //renderModule.js
        const { s: start, e: end, n: specifier } = imports[index];

        const rawUrl = source.slice(start, end); //原始的引入地址 import.meta

        if (rawUrl === "import.meta") {
          //import.meta.hot.accept(['./renderModule.js']
          const prop = source.slice(end, end + 4);

          if (prop === ".hot") {
            // 存储依赖的文件，用于热更新的时候替换文件
            if (source.slice(end + 4, end + 11) === ".accept") {
              lexAcceptedHmrDeps(
                source,
                source.indexOf("(", end + 11) + 1,
                acceptedUrls //此处存放的是原始的路径 相对的，也可能绝对的，也可以第三方的
              );
            }
          }

        }

        //./renderModule.js
        if (specifier) {
          // 从执行命令的路径开始找绝对路径，不是cli位置找
          // /src/renderModule.js
          const normalizedUrl = await normalizeUrl(specifier);

          // 替换加载路径
          if (specifier !== normalizedUrl) {
            ms.overwrite(start, end, normalizedUrl);
          }

          //把解析后的导入的模块ID添加到importedUrls
          importedUrls.add(normalizedUrl);
        }
      }

      const normalizedAcceptedUrls = new Set();

      const toAbsoluteUrl = (url) => {
        //我们找./renderModule.js的时候需要去main.js所在的目录里找相对路径
        return path.posix.resolve(path.posix.dirname(currentModule.url), url);
      };

      for (const { url, start, end } of acceptedUrls) {
        //./renderModule.js  resolveUrl是的根目录下面的
        const normalized = await normalizeUrl(toAbsoluteUrl(url));

        normalizedAcceptedUrls.add(normalized);

        ms.overwrite(start, end, JSON.stringify(normalized));
      }

      //更新模块的依赖信息
      await moduleGraph.updateModuleInfo(
        currentModule,
        importedUrls,
        normalizedAcceptedUrls
      );

      return ms.toString();
    },
  };

}

module.exports = importAnalysis;
