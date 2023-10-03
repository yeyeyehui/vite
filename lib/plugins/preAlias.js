// 更新的时候判断缓存过没，缓存过的话就直接拿缓存文件的路径使用
function preAlias() {
  let server;
  return {
    name: "preAlias",

    configureServer(_server) {
      server = _server;
    },

    resolveId(id) {
      const metadata = server._optimizeDepsMetadata;
      const isOptimized = metadata.optimized[id];

      //如果有对应的值说明此模块预编译过了
      if (isOptimized) {
        // {
        //   src: '/Users/yehui/Desktop/yehui/note/zf/webpack/21.vite50use/node_modules/vue/dist/vue.runtime.esm-bundler.js',
        //   file: '/Users/yehui/Desktop/yehui/note/zf/webpack/21.vite50use/node_modules/20.vite50/deps/vue.js'
        // }

        return {
          //file硬盘写入的是相对于deps的相对路径，但是内存里放的是vue.js的绝对路径
          id: isOptimized.file,
        };
      }
    },
  };
}

module.exports = preAlias;
