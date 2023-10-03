const scanImports = require("./scan");

const { build } = require("esbuild");

const fs = require("fs-extra");

const path = require("path");

const { normalizePath } = require("../utils");

/**
 * 分析项目依赖的第三方模块，创建依赖的缓存目录进行优化
 * @param {*} config
 */
async function createOptimizeDepsRun(config) {
  // deps={ vue: 'C:/vite50use/node_modules/vue/dist/vue.runtime.esm-bundler.js'}
  // 需要被缓存的文件列表
  const deps = await scanImports(config);

  //cacheDir = /Users/yehui/Desktop/yehui/note/zf/webpack/21.vite50use/node_modules/20.vite50
  // 缓存路径
  const { cacheDir } = config;

  // depsCacheDir = /Users/yehui/Desktop/yehui/note/zf/webpack/21.vite50use/node_modules/20.vite50/deps
  // 缓存文件路径
  const depsCacheDir = path.resolve(cacheDir, "deps");

  // /Users/yehui/Desktop/yehui/note/zf/webpack/21.vite50use/node_modules/20.vite50/deps/_metadata.json
  // 缓存配置文件路径
  const metaDataPath = path.join(depsCacheDir, "_metadata.json");

  const metadata = {
    optimized: {},
  };

  // 循环需要缓存的文件列表
  for (const id in deps) {
    const entry = deps[id];

    //内存里存的绝对路径，写入硬盘是相对路径
    const file = path.resolve(depsCacheDir, id + ".js");

    metadata.optimized[id] = {
      //C:/vite50use/node_modules/vue/dist/vue.runtime.esm-bundler.js
      src: entry,
      //C:\vite50use\node_modules\.vite\deps\vue.js
      file,
    };

    //这时会有esbuild进行预编译
    await build({
      absWorkingDir: process.cwd(),
      entryPoints: [deps[id]],
      outfile: file, //打包后写入的路径
      bundle: true,
      write: true,
      format: "esm",
    });
  }

  //写入metadata文件
  await fs.writeFile(
    metaDataPath,
    JSON.stringify(metadata, (key, value) => {
      if (key === "file" || key === "src") {
        // 绝对变成相对
        return normalizePath(path.relative(depsCacheDir, value));
      }

      return value;
    })
  );

  // {
  //   optimized: {
  //     vue: {
  //       src: '/Users/yehui/Desktop/yehui/note/zf/webpack/21.vite50use/node_modules/vue/dist/vue.runtime.esm-bundler.js',
  //       file: '/Users/yehui/Desktop/yehui/note/zf/webpack/21.vite50use/node_modules/20.vite50/deps/vue.js'
  //     }
  //   }
  // }
  return { metadata };
}

exports.createOptimizeDepsRun = createOptimizeDepsRun;
