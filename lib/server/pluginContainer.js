const { normalizePath } = require("../utils");

/**
 * 创建插件的容器，调用rolup插件
 * @param  plugins 插件的数组，它的格式和rollup插件是一样的 {name,resolveId}
 * @param root 根目录
 * @return 容器对象
 */
async function createPluginContainer({ plugins }) {
  //插件上下文类
  class PluginContext {
    //里面有很多很多工具方法 emitFile写在插件容器里不合适
    async resolve(id, importer) {
      return await container.resolveId(id, importer);
    }
  }

  //容器只是用管理插件的，里面放置了很多的插件
  const container = {
    // 这里进行加载的路径拦截并且返回新的路径
    async resolveId(path, importer) {
      let resolveId = path;

      const ctx = new PluginContext();

      // 循环所有的插件
      for (const plugin of plugins) {
        // 插件没有提供resolveId方法，结束
        if (!plugin.resolveId) continue;

        // 调用插件的resolveId方法，返回新的内容覆盖旧的
        const result = await plugin.resolveId.call(ctx, path, importer);

        if (result) {
          resolveId = result.id || result;
          break;
        }
      } // \ 变成 /

      return { id: normalizePath(resolveId) };
    },

    // 这里进行内容响应拦截，返回新的内容
    async load(id) {
      const ctx = new PluginContext();

      for (const plugin of plugins) {
        if (!plugin.load) continue;

        const result = await plugin.load.call(ctx, id);

        if (result) {
          return result;
        }
      }

      return null;
    },

    // 源码修改
    async transform(code, id) {
      const ctx = new PluginContext();

      for (const plugin of plugins) {
        if (!plugin.transform) continue;

        const result = await plugin.transform.call(ctx, code, id);

        if (!result) {
          continue;
        } else {
          code = result.code || result;
        }
      }

      return { code };
    },
  };

  return container;
}

exports.createPluginContainer = createPluginContainer;
