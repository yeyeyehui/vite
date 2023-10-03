const fs = require("fs-extra");

// 匹配html文件
const htmlTypesRE = /\.html$/;

// 获取script标签信息
const scriptModuleRE = /<script\s+type="module"\s+src\="(.+?)">/;

// 创建插件的容器，订阅插件，然后根据正则匹配触发
const { createPluginContainer } = require("../server/pluginContainer");

// 找到文件的绝对路径，也是一个插件挂给插件容器
const resolvePlugin = require("../plugins/resolve");

// 保证所有的路径路径分隔符全部是/,而非\
const { normalizePath } = require("../utils");

// config: {
//   root: '/Users/yehui/Desktop/yehui/note/zf/webpack/21.vite50use',
//   cacheDir: '/Users/yehui/Desktop/yehui/note/zf/webpack/21.vite50use/node_modules/.vite50',
//   define: { __VUE_OPTIONS_API__: true, __VUE_PROD_DEVTOOLS__: false },
//   plugins: [
//     {
//       name: 'preAlias',
//       configureServer: [Function: configureServer],
//       resolveId: [Function: resolveId]
//     },
//     { name: 'resolve', resolveId: [Function: resolveId] },
//     {
//       name: 'vue',
//       config: [AsyncFunction: config],
//       load: [AsyncFunction: load],
//       transform: [AsyncFunction: transform]
//     },
//     { name: 'define', transform: [Function: transform] },
//     {
//       name: 'importAnalysis',
//       configureServer: [Function: configureServer],
//       transform: [AsyncFunction: transform]
//     }
//   ]
// }
/**
 * 获取esbuild扫描插件的工厂方法
 * @param {*} config 配置对象 root
 * @param {*} depImports 将用来存放导入的模块
 */
async function getScanPlugin(config, depImports) {
  // 获取vite插件，执行找绝对路径功能
  const container = await createPluginContainer({
    plugins: [resolvePlugin(config)],
    root: config.root,
  });

  // 根据path往下面找，由插件容器进行路径解析，返回绝对路径
  const resolve = async function (path, importer) {
    // 在这里进行插件的发布
    return await container.resolveId(path, importer);
  };

  //rollup讲过如何写插件 {resolveId(path,importer){return 绝地路径}}
  //没有讲这个插件是如何运行的，插件机制是如何实现
  // 这个是esbuild插件给scan文件执行
  return {
    name: "scan", //依赖扫描插件

    // build.onResolve: 处理路径
    // build.onLoad: 处理内容
    setup(build) {
      //如果遇到vue文件，则返回它的绝对路径，并且标识为外部依赖，不再进一步解析了
      build.onResolve({ filter: /\.vue$/ }, async ({ path: id, importer }) => {
        //把任意路径转成绝对路径 path可能是相对./index.html 绝对c:/index.html也可能是第三方 index
        const resolved = await resolve(id, importer);

        if (resolved) {
          return {
            path: resolved.id || resolved,
            external: true,
          };
        }
      });

      //入口文件是index.html,找index.html它的真实路径，
      build.onResolve({ filter: htmlTypesRE }, async ({ path, importer }) => {
        // path: /Users/yehui/Desktop/yehui/note/zf/webpack/21.vite50use/index.html
        // importer:
        // resolved: {id: /Users/yehui/Desktop/yehui/note/zf/webpack/21.vite50use/index.html}
        //把任意路径转成绝对路径 path可能是相对./index.html 绝对c:/index.html也可能是第三方 index
        const resolved = await resolve(path, importer);

        if (resolved) {
          return {
            path: resolved.id || resolved,
            namespace: "html",
          };
        }
      });

      // 所有文件都会走这个路径
      build.onResolve({ filter: /.*/ }, async ({ path, importer }) => {
        //把任意路径转成绝对路径 path可能是相对./index.html 绝对c:/index.html也可能是第三方 index
        const resolved = await resolve(path, importer);

        if (resolved) {
          const id = resolved.id || resolved; //此模块的绝对路径

          // 外部模块
          if (id.includes("node_modules")) {
            //key是包名，值是此包esmodule格式的入口文件的绝对路径
            depImports[path] = normalizePath(id);
            return {
              path: id, // /Users/yehui/Desktop/yehui/note/zf/webpack/21.vite50use/node_modules/vue/dist/vue.runtime.esm-bundler.js
              external: true, //表示这是一个外部模块，不需要进一步处理了
            };
          } else {
            return {
              path: id,
            };
          }
        }
      });

      // 匹配条件，处理响应内容，把src加载的内容缓存import加载
      build.onLoad({ filter: htmlTypesRE, namespace: "html" }, ({ path }) => {
        //需要把html转成JS才能进行后续的处理
        // 获取文件内容
        const html = fs.readFileSync(path, "utf8");

        // 获取src值
        let [, src] = html.match(scriptModuleRE);

        // 换成esm加载
        let jsContent = `import ${JSON.stringify(src)}`; //import "/src/main.js"

        return {
          contents: jsContent,
          loader: "js",
        };
      });
    },
  };
}

module.exports = getScanPlugin;
