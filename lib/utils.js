//保证所有的路径路径分隔符全部是/,而非\
exports.normalizePath = function normalizePath(path) {
  return path.replace(/\\/g, "/");
};

const knowJsSrcRE = /\.(js|vue)($|\?)/;

/**
 * 判断文件类型，js或者vue文件
 * @param {*} url 文件链接
 * @returns true 是js或者vue, false不是js或者vue
 */
const isJSRequest = (url) => {
  return knowJsSrcRE.test(url);
};

exports.isJSRequest = isJSRequest;
