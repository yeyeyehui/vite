let envPlugin = {
  name: "env", //插件的名字

  //setup函数在每次BUILD API调用时都会运行一次
  setup(build) {
    //设置函数
    //webpack resolveLoader rollup resolveId 它们都是在获取此模块的绝对路径
    //使用添加的回调 onResolve 将在 esbuild 构建的每个模块中的每个导入路径上运行
    //在编译每个模块的时候,会用模块的路径和此回调的filter正则进行匹配,匹配上执行回调,匹配不上则跳过此回调
    //如果不写onResolve回调,esbuild会默认去硬盘上找模块路径
    build.onResolve({ filter: /^env$/, namespace: "file" }, ({ path }) => {
      //env ./msg
      return {
        external: false, //是否是外部模块,如果是外部的话不处理了
        //namespace: 'env-namespace',//表示此模块属于env-namespace命名空间了
        path: "/Users/yehui/Desktop/github/vite/msg.js", // env 解析得 到的路径 ,在默认情况下,如果是普通模块的话,会返回普通模块文件系统中的绝对路径
      };
    });

    // 匹配import路径，控制返回的文件内容
    build.onLoad({ filter: /^env$/, namespace: "file" }, ({ path }) => {
      return {
        contents: JSON.stringify(process.env),
        loader: "json",
      };
    });
  },
};

//webpack loader pitch 读文件 normals
require("esbuild")
  .build({
    entryPoints: ["entry.js"],
    bundle: true,
    plugins: [envPlugin],
    outfile: "out.js",
  })
  .catch((error) => console.log(error));

/**
{
  path: 'env',//引入的模块的名字
  namespace: 'file',//命名空间的名字
  //从哪里引入的,或者说是哪个模块引入的这个env
  importer: 'C:\\aproject\\webpack202208\\14.vite\\entry.js',
  resolveDir: 'C:\\aproject\\webpack202208\\14.vite',//根目录
  kind: 'import-statement',//导入语句
} 
*/
