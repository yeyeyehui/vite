20:04
丁浩宇
可以使用pnpm，这个安装块，而且不用切换源 
20:11
Wáng
如果包没有指定module是不是就不行了 
module指的是es module
如果包没有指定module, 


//每个内容类型都有一个关联的加载器，它告诉 esbuild 如何解释文件内容

在webpack里
module rules 
{
  test:/\.css/,
  loader:'style-loader'
}

Wáng
不是用roullup打包吗，怎么用这个打包 
vite在开发环境下打包用的是esbuild
在生产环境下打包用是rollup

123
env 是装的吗 


好大鸭
这个命名空间有啥用 
它的作用是用来过滤的
通过它来过滤你想处理的模块
类似于过滤条件
webpack rule {test:/\.js$/}
123
外部模块为啥不管了 
管不了
123
怎么拿到env。js 呢？ 
因为根本没有env.js这个文件 这是一个虚拟模块

rollup 插件
resolveId 返回路径
load 返回内容





erickangxu
esbuild啥时候使用呢 
在vite启动的时候会使用esbuild来进行预编译
node_modules\.vite\deps\vue.js 就是用esbuild编译出来的
20:51
Wáng
resolve中return的内容回到load中？ 
加载一个模块分二步走
1.找到模块的路径 resolve
2.根据路径获取模块内容 load

erickangxu
json.stringify 
123
build。onload。 过滤 env 是啥？ 
123
还是form ’env‘？ 
丁浩宇
第三方模块是不是也会走插件，然后由于不匹配过滤规则，所以去找node_modules 



正常如何找模块
1.找到模块的路径 resolve
C:\aproject\webpack202208\14.vite\msg.js
2.根据路径获取模块内容 load
fs.readFile(C:\aproject\webpack202208\14.vite\msg.js);



不管是rollup还是esbuild默认都不支持第三方模块
如果是第三方的,根本不处理
插件你写了就有,没写就没有
第三方模块是不是也会走插件，然后由于不匹配过滤规则，所以去找node_modules 
123
看看path 路径是啥 

erickangxu
一个插件，必须有resolve和onload？ 
不是的

好大鸭
啥时候使用虚拟模块 
yjg
不存在的文件就是虚拟 
韦林
模块拦截 


createApp不是createVue 
21:04
丁浩宇
如果我们遇到某个功能，需要写插件，
那是不是需要写两套，
如果是开发环境写esBuild插件，如果是生产环境写rullup插件 
Wáng
他也要打包，但是为啥他更快呢？ 
有些时候要进行一些转换
commonjs vite转成 esm


123
看看报错事去哪里找env了 


浏览器自己就支持esm，那要esbuild干啥 


有时候,比如在服务器启动前要进行预编译 
要在服务器启动前找到所有的第三方依赖,然后通过  esbuild编译到.vite目录里
这样在服务器接收到用户访问的时候,就可以直接返回了,不用去一个请求
减少HTTP请求次数


21:16
Tony
那是不是就没有tree shake 了 
丁浩宇
开发环境也不需要tree shaking 
韦林
把模块的路径改成相对路径 
好大鸭
没用到就不会import 
好大鸭
没用到不会请求这个文件 



用 require 这种方式方式访问，那个插件还可以用吗 

