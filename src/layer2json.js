import { isLayerOpacity, isLayerCovered, parseBlur, parseBorder, parseBorderRadius, parseBackground, parseShadow, isLayerNoStyle, parseTextStyle, isRectangleOverlap } from './utils'

/** @typedef {import('./layer').Layer} Layer */

/**
 * @param {Layer} layer
 */
export function layer2json(layer) {
  const layerData = JSON.parse(JSON.stringify(layer))

  const traverse = (layer, cb) => {
    const { layers, ...rest } = layer
    if (layers) {
      // 1. 首次遍历需要将 layers 顺序调整下，顶层 layer 排前面（后面可以按顺序计算遮挡问题）
      /** @type {Layer[]} */
      let newLayers = layers.filter(l => !l.hidden).map(l => traverse(l, cb)).reverse()

      // 2. 判断遮挡，被遮挡的图层不显示
      /** @type {Layer['frame'][]} */
      const opacityFrames = []
      /** @type {(layer: Layer) => boolean} */
      const contains = (layer) => {
        if (isLayerCovered(layer, opacityFrames)) return true
        if (isLayerOpacity(layer)) opacityFrames.push({...layer.frame})
        return false
      }
      newLayers = newLayers.filter(layer => !contains(layer))

      // 3. 最后赋值
      rest.layers = newLayers
    }
    return cb(rest)
  }

  const layerDataNew = traverse(layerData, mapLayer)
  deepFilterDFS(layerDataNew)
  deepFilterNFS(layerDataNew)
  return layerDataNew
}

/**
 * 移除空图层，或不可见图层（深度优先）
 * @param {Layer} layer
 * @param {Layer} parent
 */
function deepFilterDFS(layer, parent) {
  if (layer.layers) {
    layer.layers = layer.layers.filter(l => deepFilterDFS(l, layer))
  }
  // 类型是图片，但没有配图，不显示
  if (layer.type === 'Image' && layer.image == null) return false
  // 类型是图片，但没有子元素，不显示
  if (layer.type === 'Group' && (!layer.layers || layer.layers.length === 0)) return false
  // 透明度为 0，也不显示
  if (layer.style && layer.style.opacity === 0) return false
  return true
}
/**
 * 移除空图层，或不可见图层（广度优先）
 * @param {Layer} layer
 * @param {Layer} parent
 */
function deepFilterNFS(layer, parent) {
  const isSqueezable = (l1, l2) => {
    // l2 坐标需要是 (0, 0)
    // l2 可以有样式（因为 l2 不会剔除）
    return l2.frame.x === 0 && l2.frame.y === 0 &&
      l1.frame.width === l2.frame.width &&
      l1.frame.height === l2.frame.height &&
      isLayerNoStyle(l1)
  }
  // 循环移除无用的空层级
  const squeeze = () => {
    const childLayer = layer.layers && layer.layers[0]
    if (layer.layers && layer.layers.length === 1 && isSqueezable(layer, childLayer)) {
      if (isLayerNoStyle(childLayer)) {
        layer.layers = layer.layers[0].layers
        return true
      } else {
        // 将 child 复制到上一层级去
        const frame = layer.frame
        Object.keys(layer).forEach(key => delete layer[key])
        Object.keys(childLayer).forEach(key => layer[key] = childLayer[key])
        childLayer.frame = frame
        return false
      }
    }
  }
  while (squeeze()) { continue }

  // 判断当前节点是不是超出了父容器，超出的话也可以不用显示
  if (parent && !isRectangleOverlap(
    parent.frame,
    {...layer.frame, x: parent.frame.x + layer.frame.x, y: parent.frame.y + layer.frame.y}
  )) return false

  // 继续遍历（layers 可能为空）
  if (layer.layers) {
    layer.layers = layer.layers.filter(l => deepFilterNFS(l, layer))
  }
  return true
}

/**
 * @param {Layer['style']} style
 */
function mapStyle(style) {
  /** @type {Layer['css']} */
  const css = {}

  if (typeof style.opacity === 'number') {
    if (style.opacity > 0 && style.opacity < 1) css.opacity = parseFloat(style.opacity.toFixed(2))
  }
  if (style.blur) {
    const blur = parseBlur(style.blur)
    if (blur) css.blur = blur
  }
  if (style.borders) {
    const border = style.borders.filter(b => b.enabled).map(parseBorder).filter(Boolean)
    if (border.length) css.border = border
  }
  if (style.fills) {
    const background = style.fills.filter(b => b.enabled).map(parseBackground).filter(Boolean)
    if (background.length) css.background = background
  }

  const shadows = []
  if (style.shadows) shadows.push(...style.shadows.map(s => parseShadow(s)))
  if (style.innerShadows) shadows.push(...style.innerShadows.map(s => parseShadow(s, true)))
  if (shadows.filter(Boolean).length) css['box-shadow'] = shadows.filter(Boolean)
  return css
}

/**
 * @param {Layer['frame']} frame
 */
function mapFrame(frame) {
  const round = (val) => typeof val === 'number' && val >= 1 ? Math.round(val) : val
  if (frame) {
    frame.height = round(frame.height)
    frame.width = round(frame.width)
    frame.x = round(frame.x)
    frame.y = round(frame.y)
  }
  return frame
}

/**
 * @param {Layer} layer
 */
function mapLayer(layer) {
  /** @type {Layer['css']} */
  const css = {}
  if (layer.points) {
    const borderRadius = parseBorderRadius(layer)
    if (borderRadius) css['border-radius'] = borderRadius
  }

  const baseCss = mapStyle(layer.style)
  Object.assign(css, baseCss)

  const textCss = parseTextStyle(layer)
  if (textCss) Object.assign(css, textCss)

  if (layer.exportFormats) {
    // 有切图，则可以删除子图层
    if (layer.exportFormats.length) {
      delete layer.layers
      layer.type = 'Cut' // 标记有切图
    }
  }
  if (layer.type !== 'Cut') delete layer.id // 只有切图才需要保存 id，其它字段 id 无用
  delete layer.exportFormats
  delete layer.points
  delete layer.selected
  delete layer.hidden
  delete layer.locked
  delete layer.closed
  delete layer.transform
  delete layer.sharedStyleId
  delete layer.smartLayout
  delete layer.lineSpacing
  delete layer.style
  delete layer.fixedWidth
  if (layer.name === (layer.text && layer.text.trim())) delete layer.text
  if (layer.frame) {
    layer.frame = mapFrame(layer.frame)
  }
  if (Object.keys(css).length) {
    layer.css = css
  }
  // const { name, type, frame, layers, shapeType } = layer
  // return { name, type, frame, layers, shapeType }
  return layer
}