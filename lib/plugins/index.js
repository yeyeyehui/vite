const resolvePlugin = require("./resolve");

const importAnalysisPlugin = require("./importAnalysis");

const preAliasPlugin = require("./preAlias");

const definePlugin = require("./define");

async function resolvePlugins(config, userPlugins) {
  //现在此处返回的是vite的内置插件
  return [
    preAliasPlugin(config),
    resolvePlugin(config),
    ...userPlugins,
    definePlugin(config),
    importAnalysisPlugin(config),
  ];
}

exports.resolvePlugins = resolvePlugins;
