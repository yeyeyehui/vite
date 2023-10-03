const pathLib = require("path");

const fs = require("fs-extra");

// 在node_modules里面找匹配的文件名获取绝对路径
const resolve = require("resolve");

//既是一个vite插件也是一个rollup 插件
// root: /Users/yehui/Desktop/yehui/note/zf/webpack/21.vite50use
function resolvePlugin({ root }) {
  return {
    name: "resolve",

    //path绝对,相对,第三方,别名
    resolveId(path, importer) {
      //如果path是一个绝对路径
      //  /src/main.js，相对路径并且不是苹果系统的绝对路径开头
      if (path.startsWith("/") && !path.startsWith("/Users")) {
        //如果path以/开头，说明它是一个根目录下的绝对路径
        return { id: pathLib.resolve(root, path.slice(1)) };
      }

      // 检测path是否为绝对路径
      if (pathLib.isAbsolute(path)) {
        return { id: path };
      }

      //如果是相对路径的话
      if (path.startsWith(".")) {
        const baseDir = importer ? pathLib.dirname(importer) : root;

        const fsPath = pathLib.resolve(baseDir, path);

        return { id: fsPath };
      }

      // 实现alise功能
      // if (path.startsWith("@")) {
      //   const baseDir = alias["@"];

      //   const fsPath = pathLib.resolve(baseDir, path);

      //   return { id: fsPath };
      // }

      //如果是第三方的话就获取第三方模块的文件路径信息
      let res = tryNodeResolve(path, importer, root);

      if (res) return res;
    },
  };
}

// 第三方路径
function tryNodeResolve(path, importer, root) {
  // vue/package.json，获取package路径
  const pkgPath = resolve.sync(`${path}/package.json`, { basedir: root });

  // 获取绝对路径
  const pkgDir = pathLib.dirname(pkgPath);

  // 获取package文件内容
  const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));

  // main一般是commonjs 或者是es5
  // module es module es6
  // module字段指的是是es module格式的入口
  const entryPoint = pkg.module;

  const entryPointPath = pathLib.join(pkgDir, entryPoint);

  // C:\vite50use\node_modules\vue\dist\vue.runtime.esm-bundler.js
  // 第三方模块的入口文件路径，现在返回的vue的es module的入口文件
  return { id: entryPointPath };
}

module.exports = resolvePlugin;
