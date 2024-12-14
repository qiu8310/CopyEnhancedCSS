import { layer2json } from './layer2json';
import { isRectangle, NOT_SUPPORT } from './utils';
const sketch = require('sketch')

export function copyRawJSON() {
  const layer = getLayer();
  if (!layer) return
  copyToClipboard(JSON.stringify(layer, null, 2));
}
export function copyJSON() {
  const layer = getLayer();
  if (!layer) return
  copyToClipboard(JSON.stringify(layer2json(layer), null, 2));
}
export function copyCSS() {
  const layer = getLayer();
  if (layer) copyToClipboard(getEnhancedCSS(layer2json(layer)));
}

function getLayer() {
  const document = sketch.fromNative(context.document)
  const { selectedLayers } = document;
  if (selectedLayers.length !== 1) {
    sketch.UI.message('Please select only one layer');
    return;
  }
  return selectedLayers.layers[0]
}

/** @param {import('./layer').Layer} layer */
function getEnhancedCSS(layer) {
  const result = []
  const css = layer.css || {}
  const frame = layer.frame || {}

  Object.keys(css).forEach(key => {
    let val = css[key]
    if (Array.isArray(val)) {
      const newVal = val.map(v => {
        v = `${v}`
        if (v.startsWith(NOT_SUPPORT)) {
          result.push(`/* ${v} */`)
          return ''
        } else {
          return v
        }
      }).filter(Boolean).join(', ')
      if (newVal) result.push(`${key}: ${newVal};`)
    } else {
      val = `${val}`
      if (val.startsWith(NOT_SUPPORT)) {
        result.push(`/* ${val} */`)
      } else {
        result.push(`${key}: ${val};`)
      }
    }
  })

  if (layer.layers && layer.layers.length) {
    // 先将 layers 打平来
    let layers = []
    let deep = (layer) => {
      if (layer.layers && layer.layers.length) {
        layer.layers.forEach(deep)
      } else {
        layers.push(layer)
      }
    }
    deep(layer)

    // 只复制首次出现的矩形，否则代码中会出现太多矩形了
    const codes = layers.map(l => {
      const prefix = `/* ${l.shapeType || l.type}: ${l.text || l.name} */`
      const code = getEnhancedCSS(l)
      if (code) return `${prefix}\n${code}`
    }).filter(Boolean)
    return codes.join('\n\n')
  } else if (layer.type === 'Text') {
    // 代码都在 css 里
  } else if (isRectangle(layer)) {
    if (frame.width) result.unshift(`width: ${frame.width}px;`)
    if (frame.height) result.unshift(`height: ${frame.height}px;`)
  }
  return result.map(l => l + '\n').join('')
}

function copyToClipboard(text) {
  const pasteboard = NSPasteboard.generalPasteboard();
  pasteboard.declareTypes_owner([NSPasteboardTypeString], null);
  pasteboard.setString_forType(text, NSPasteboardTypeString);
}