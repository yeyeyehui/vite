const fs = require("fs-extra");

const {
  parse,
  compileScript, //编译脚本
  rewriteDefault,
  compileTemplate, //编译模板
  compileStyleAsync, //编译样式
} = require("vue/compiler-sfc");

const hash = require("hash-sum");

const dedent = require("dedent");

const descriptorCache = new Map();

function vue() {
  let root; //根目录
  return {
    name: "vue",

    async config(config) {
      root = config.root;
      // 修改共享变量
      return {
        define: {
          __VUE_OPTIONS_API__: true,
          __VUE_PROD_DEVTOOLS__: false,
        },
      };
    },

    // id: /Users/yehui/Desktop/yehui/note/zf/webpack/21.vite50use/src/App.vue?vue&type=style&index=0&lang.css
    async load(id) {
      // filename: /Users/yehui/Desktop/yehui/note/zf/webpack/21.vite50use/src/App.vue
      // query: URLSearchParams { 'vue' => '', 'type' => 'style', 'index' => '0', 'lang.css' => '' }
      const { filename, query } = parseVueRequest(id);

      // 是vue文件类型
      if (query.has("vue")) {
        const descriptor = await getDescriptor(filename);

        // 有样式
        if (query.get("type") === "style") {
          let styleBlock = descriptor.styles[Number(query.get("index"))];
          
          if (styleBlock) {
            return { code: styleBlock.content }; //h1{color:red}
          }
        }

      }
    },

    // 返回需要渲染的源代码
    async transform(code, id) {
      const { filename, query } = parseVueRequest(id); // /src/App.vue

      // 如果路径是.vue结尾，返回编译方法
      if (filename.endsWith(".vue")) {
        // 样式文件
        // /Users/yehui/Desktop/yehui/note/zf/webpack/21.vite50use/src/App.vue?vue&type=style&index=0&lang.css
        if (query.get("type") === "style") {
          // 获取样式文件的描述信息对象
          const descriptor = await getDescriptor(filename);

          let result = await transformStyle(
            code,
            descriptor,
            Number(query.get("index"))
          );

          return result;
        } else {
          // .vue文件
          // Users/yehui/Desktop/yehui/note/zf/webpack/21.vite50use/src/App.vue
          return await transformMain(code, filename);
        }
      }

      return null;
    },
  };
}

// 解析绝对路径，获取文件绝对路径和路径参数
function parseVueRequest(id) {
  //App.vue?id=1  filename=App.vue query={id:1}
  const [filename, querystring = ""] = id.split("?");

  let query = new URLSearchParams(querystring); //qs

  return {
    filename,
    query,
  };
}

// 拿到文件描述信息对象
async function getDescriptor(filename) {
  // 获取缓存的文件列表
  let descriptor = descriptorCache.get(filename);

  // 之前加载过并且缓存，直接返回缓存的文件路径
  if (descriptor) return descriptor;

  //读取App.vue文件的内容
  const content = await fs.readFile(filename, "utf8");

  const result = parse(content, { filename });

  // 文件描述信息对象
  // descriptor: {
  //   filename: '/Users/yehui/Desktop/yehui/note/zf/webpack/21.vite50use/src/App.vue',
  //   source: '<template>\n' +
  //     '  <h1>App</h1>\n' +
  //     '</template>\n' +
  //     '<script>\n' +
  //     'export default {\n' +
  //     "    name:'App'\n" +
  //     '}\n' +
  //     '</script>\n' +
  //     '<style>\n' +
  //     '  h1{\n' +
  //     '    color:red;\n' +
  //     '  }\n' +
  //     '</style>',
  //   template: {
  //     type: 'template',
  //     content: '\n  <h1>App</h1>\n',
  //     loc: [Object],
  //     attrs: {},
  //     ast: [Object],
  //     map: [Object]
  //   },
  //   script: {
  //     type: 'script',
  //     content: "\nexport default {\n    name:'App'\n}\n",
  //     loc: [Object],
  //     attrs: {},
  //     map: [Object]
  //   },
  //   scriptSetup: null,
  //   styles: [ [Object] ],
  //   customBlocks: [],
  //   cssVars: [],
  //   slotted: false,
  //   shouldForceReload: [Function: shouldForceReload]
  // },
  descriptor = result.descriptor;

  descriptor.id = hash(filename);

  // 缓存路径，提供二次编译使用
  descriptorCache.set(filename, descriptor);

  return descriptor;
}

// 样式代码
async function transformStyle(code, descriptor, index) {
  const styleBlock = descriptor.styles[index];

  const result = await compileStyleAsync({
    filename: descriptor.filename, //文件名
    source: code, //样式的源代码
    id: `data-v-${descriptor.id}`, //为了实现局部作用域，需要一个唯一的ID,来着代码描述对象
    scoped: styleBlock.scoped, //实现局部样式
  });
  let styleCode = result.code;
  return {
    code: `
     var style = document.createElement('style');
     style.innerHTML = ${JSON.stringify(styleCode)};
     document.head.appendChild(style);
  `,
  };
}

// 解析.vue文件
async function transformMain(source, filename) {
  // 获取文件描述符号
  const descriptor = await getDescriptor(filename);

  // 生产脚本代码
  // const _sfc_main = {
  //   name:'App'
  // }
  const scriptCode = genScriptCode(descriptor, filename);

  // 获取模版code
  // import { openBlock as _openBlock, createElementBlock as _createElementBlock } from "vue"
  // export function render(_ctx, _cache) {
  //   return (_openBlock(), _createElementBlock("h1", null, "App"))
  // }
  const templateCode = genTemplateCode(descriptor, filename);

  // 样式代码
  const styleCode = genStyleCode(descriptor, filename);

  let code = [
    styleCode,
    scriptCode,
    templateCode,
    " _sfc_main.render = render;",
    "export default _sfc_main;",
  ].join("\n");

  return { code };
}

// 生产脚本代码
function genScriptCode(descriptor, id) {
  let script = compileScript(descriptor, { id });

  return rewriteDefault(script.content, "_sfc_main");
}

// 获取模版code
function genTemplateCode(descriptor, id) {
  let content = descriptor.template.content;

  let result = compileTemplate({ source: content, id });

  return result.code;
}

// 获取样式代码
function genStyleCode(descriptor, filename) {
  let styleCode = "";

  if (descriptor.styles.length > 0) {

    descriptor.styles.forEach((style, index) => {
      const query = `?vue&type=style&index=${index}&lang.css`;

      const styleRequest = (filename + query).replace(/\\/g, "/");

      //import "/src/App.vue?vue&type=style&index=0&lang.css"
      styleCode += `\nimport "${styleRequest}"`;
    });

    return styleCode;
  }
}

module.exports = vue;

// 最终目的是要生成这样一个脚本，transformMain这个方法处理
/*
  const _sfc_main = {
    name: 'App'
  }
  import { openBlock as _openBlock, createElementBlock as _createElementBlock } from "/node_modules/.vite50/deps/vue.js"
  function _sfc_render(_ctx, _cache) {
    return (_openBlock(), _createElementBlock("h1", null, "App"))
  }
  _sfc_main.render = _sfc_render;
  export default _sfc_main;
*/
