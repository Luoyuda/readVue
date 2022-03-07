# 从打包开始阅读Vue源码

首先看 `package.json` 中的 `script.build`  定位到 `build.js`

![image-20220307091956351](C:\code\readVue\1-打包相关\Vue打包内容.assets\image-20220307091956351.png)

## build.js

1. 首先读取所有的构建内容， 然后执行 `build` 方法

   ![image-20220307093104135](C:\code\readVue\1-打包相关\Vue打包内容.assets\image-20220307093104135.png)

2. 递归执行并写入文件

   ![image-20220307093240637](C:\code\readVue\1-打包相关\Vue打包内容.assets\image-20220307093240637.png)

3.  分析构建入口得知运行时入口为 `web/entry-runtime.js`

   ![image-20220307093656901](C:\code\readVue\1-打包相关\Vue打包内容.assets\image-20220307093656901.png)

4.  `web/entry-runtime.js` 入口引入 `Vue ` 构造函数并暴露

![image-20220307093751639](C:\code\readVue\1-打包相关\Vue打包内容.assets\image-20220307093751639.png)

