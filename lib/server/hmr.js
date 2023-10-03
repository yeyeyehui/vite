/**
 * 当检测到文件发生改变后，处理热更新
 * 向上冒泡找到可以处理这个文件的模块为止，都不能处理就刷新页面
 * @param {*} file 变化的文件
 * @param {*} server
 */
async function handleHMRUpdate(file, server) {
  const { moduleGraph, ws } = server;

  // ModuleNode {
  //   importers: Set(1) {
  //     ModuleNode {
  //       importers: [Set],
  //       acceptedHmrDeps: [Set],
  //       url: '/src/mainbak.js',
  //       type: 'js'
  //     }
  //   },
  //   acceptedHmrDeps: Set(0) {},
  //   url: '/src/renderModule.js',
  //   type: 'js'
  // }

  // 找到对应的模块对象
  const updateModule = moduleGraph.getModuleById(file);

  if (updateModule) {
    const updates = [];

    // 存储变更的模块信息
    const boundaries = new Set();

    propagateUpdate(updateModule, boundaries);

    // [
    //   {
    //     type: 'js-update',
    //     path: '/src/mainbak.js',
    //     acceptedPath: '/src/renderModule.js'
    //   }
    // ]
    updates.push(
      ...[...boundaries].map(({ boundary, acceptedVia }) => ({
        type: `${boundary.type}-update`,
        path: boundary.url, //边界
        acceptedPath: acceptedVia.url, //变更的模块路径
      }))
    );

    // [
    //   {
    //     type: 'js-update',
    //     path: '/src/mainbak.js', // 需要更新的首文件
    //     acceptedPath: '/src/renderModule.js'
    //   }
    // ]
    // 更新文件
    ws.send({
      type: "update",
      updates,
    });
  }
}

/**
 * 找到updateModule的边界，放到boundaries集合中
 * @param {*} updateModule
 * @param {*} boundaries
 */
function propagateUpdate(updateModule, boundaries) {
  // 判断当前变更的文件路径是否有对应的文件模块信息
  if (!updateModule.importers.size) return;

  for (const importerModule of updateModule.importers) {
    if (importerModule.acceptedHmrDeps.has(updateModule)) {
      boundaries.add({
        boundary: importerModule, //界面就是接收变更的模块
        acceptedVia: updateModule, //通过谁得到的变更，其实就是变更的模块
      });
    }
  }
}

//有限状态机
const LexerState = {
  inCall: 0, //方法调用中
  inQuoteString: 1, //在字符串中，引号里面就是1
};

/**
 * 替换文件的import路径
 * //import.meta.hot.accept(['./renderModule.js','otherModule.js']
 * @param {*} code 模块源代码
 * @param {*} start 开始查找位置
 * @param {*} acceptedUrls 解析到热更新依赖后放到哪个集合里
 */
function lexAcceptedHmrDeps(code, start, acceptedUrls) {
  let state = LexerState.inCall;

  let currentDep = ""; //当前的依赖名

  function addDep(index) {
    acceptedUrls.add({
      url: currentDep,
      start: index - currentDep.length - 1,
      end: index + 1,
    });
    currentDep = "";
  }
  
  for (let i = start; i < code.length; i++) {
    const char = code.charAt(i);
    switch (state) {
      case LexerState.inCall:
        if (char === `'` || char === `"`) {
          state = LexerState.inQuoteString;
        }
        break;
      case LexerState.inQuoteString:
        if (char === `'` || char === `"`) {
          addDep(i);
          state = LexerState.inCall;
        } else {
          currentDep += char;
        }
        break;
    }
  }
}

exports.handleHMRUpdate = handleHMRUpdate;

exports.lexAcceptedHmrDeps = lexAcceptedHmrDeps;
