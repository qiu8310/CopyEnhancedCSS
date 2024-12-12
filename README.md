# Copy Enhanced CSS

## Debug

Directly use the command to execute the plugin (no need to install):

```bash
sketchtool run ./plugin.sketchplugin copyenhancedcss --without-activating
```

sketchtool:

```bash
sketchtool="$(mdfind kMDItemCFBundleIdentifier=='com.bohemiancoding.sketch3' | head -n 1)/Contents/MacOS/sketchtool"
```


## Reference
* [Sketch plugin development tool: skpm](https://github.com/skpm/skpm/blob/master/README.md)
* [Sketch plugin develop center](https://developer.sketch.com/)

