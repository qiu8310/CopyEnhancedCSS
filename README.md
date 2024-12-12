# Copy Enhanced CSS


## 调试

直接使用命令执行插件（无需安装）：

```bash
sketchtool run ./plugin.sketchplugin copyenhancedcss --without-activating
```

sketchtool 配置路径：

```bash
sketchtool="$(mdfind kMDItemCFBundleIdentifier=='com.bohemiancoding.sketch3' | head -n 1)/Contents/MacOS/sketchtool"
```


## 参考
* [插件开发工具 skpm](https://github.com/skpm/skpm/blob/master/README.md)
* [Sketch 官方开发文档](https://developer.sketch.com/)

