// 保证所有的路径路径分隔符全部是/,而非\
const { normalizePath } = require("./utils");

const path = require("path");

// 获取全部的plugins
const { resolvePlugins } = require("./plugins");

const fs = require("fs-extra");

/**
 * 获取配置路径
 * @returns {String} root 当前命令所在的目录 = 绝对路径/vite
 * @returns {String} cacheDir 文件缓存路径 = 绝对路径/vite/node_modules/.myvite
 * @returns {object} define: { __VUE_OPTIONS_API__: true,  __VUE_PROD_DEVTOOLS__: false, }, // plugin-vue插件给的数据
 * @returns {String}   plugins: vite默认插件和用户配置插件组合
 */
async function resolveConfig() {
  // __dirname： 当前模块所在目录
  const root = normalizePath(process.cwd());

  const cacheDir = normalizePath(path.resolve(`node_modules/.myvite`));

  let config = {
    root,
    cacheDir,
  };

  // 获取配置文件, 绝对路径/vite/lib/vite.config.js
  const configFile = path.resolve(root, "lib/vite.config.js");

  // 给定的文件路径是否存在
  const exists = await fs.pathExists(configFile);

  let userPlugins = [];

  if (exists) {
    // 获取文件内容
    const userConfig = require(configFile);

    // 拿出plugins进行单独处理
    userPlugins = userConfig.plugins || [];

    delete userConfig.plugins;

    // 存储用户自己设置的插件
    config = { ...config, ...userConfig };
  }

  // 获取插件的config中的属性进行合并
  for (let plugin of userPlugins) {
    // 调用plugin.config配置获取返回的内容存储在config配置中提供其他插件等使用
    if (plugin.config) {
      let res = await plugin.config(config);
      if (res) config = { ...config, ...res };
    }
  }

  // 把config传递给其他内置组件
  // 把用户自定义的组件和内置组件合一起，组成一个新的组件对象
  config.plugins = await resolvePlugins(config, userPlugins);

  // {
  //   root: '/Users/yehui/Desktop/yehui/note/zf/webpack/21.vite50use',
  //   cacheDir: '/Users/yehui/Desktop/yehui/note/zf/webpack/21.vite50use/node_modules/.20.vite50',
  //   define: { __VUE_OPTIONS_API__: true, __VUE_PROD_DEVTOOLS__: false }
  // }
  return config;
}

module.exports = resolveConfig;
