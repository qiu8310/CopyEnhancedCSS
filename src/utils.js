/** @typedef {import('./layer').Layer} Layer */

export const NOT_SUPPORT = 'NOT_SUPPORT_'

/**
 * 判断一个图层是不是矩形
 * @param {Layer} layer
 * @returns
 */
export function isRectangle(layer) {
  return layer.type === 'Rectangle' || layer.shapeType === 'Rectangle'
}

/**
 * 图层是不是不透明的（放在它底下的元素就可以不显示）
 * @param {Layer} layer
 */
export function isLayerOpacity(layer) {
  const style = layer.style || {}
  if (typeof style.opacity === 'number' && style.opacity < 1) return false
  if (style.fills && style.fills.length) {
    // 只要有一个填充是透明的，就不应该是“不透明”的
    if (style.fills.filter(fill => fill.enabled).some(fill => {
      if (fill.fillType === 'Color') {
        return hexColor2RGBA(fill.color).a < 1
      } else if (fill.fillType === 'Gradient' && fill.gradient && fill.gradient.stops) {
        return fill.gradient.stops.some(stop => hexColor2RGBA(stop.color).a < 1)
      } else {
        return false
      }
    })) {
      return false
    }
  }
  return true
}

/**
 * 图层是否无任何样式的容器
 * @param {Layer} layer
 */
export function isLayerNoStyle(layer) {
  return !layer.css && layer.type === 'Group'
}

function isPointInsideRectangle(px, py, rect) {
  return px >= rect.x && px <= rect.x + rect.width &&
         py >= rect.y && py <= rect.y + rect.height;
}
/**
 * 判断一个矩形是否被基于矩形给覆盖了
 * @param {Layer} layer
 * @param {Layer['frame'][]} rectangles
 */
export function isLayerCovered(layer, rectangles) {
  // 分别检查目标矩形的四个角和边缘的一些关键点
  const frame = layer.frame
  const points = [
    { x: frame.x, y: frame.y },
    { x: frame.x + frame.width, y: frame.y },
    { x: frame.x, y: frame.y + frame.height },
    { x: frame.x + frame.width, y: frame.y + frame.height },
    { x: frame.x + frame.width / 2, y: frame.y },
    { x: frame.x + frame.width / 2, y: frame.y + frame.height },
    { x: frame.x, y: frame.y + frame.height / 2 },
    { x: frame.x + frame.width, y: frame.y + frame.height / 2 }
  ];
  return points.every(point =>
    rectangles.some(rect => isPointInsideRectangle(point.x, point.y, rect))
  );
}

/**
 * 将 hex 颜色转化成 rgba 对象
 * @param {string} hexColor
 * @returns
 */
export function hexColor2RGBA(hexColor) {
  if (typeof hexColor === 'string' && hexColor.startsWith('#')) {
    const upper = hexColor.toUpperCase()
    const r = parseInt(upper.slice(1, 3), 16)
    const g = parseInt(upper.slice(3, 5), 16)
    const b = parseInt(upper.slice(5, 7), 16)
    const a = upper.slice(7, 9) ? parseFloat((parseInt(upper.slice(7, 9), 16) / 255).toFixed(2)) : 1
    return { r, g, b, a }
  }
  throw new Error(`The current color value "${hexColor}" cannot be parsed.`)
}

/**
 * 解析矩形的圆角，返回一个四维数组
 * @param {Layer} layer
 */
export function parseBorderRadius(layer) {
  if (
    isRectangle(layer) &&
    layer.points &&
    layer.points.length === 4 &&
    layer.points.every(p => typeof p.cornerRadius === 'number') &&
    layer.points.some(p => p.cornerRadius !== 0)
  ) {
    return layer.points.map(p => Math.round(p.cornerRadius))
  }
}
/**
 * @param {Layer['style']['borders'][number]} border
 */
export function parseBorder(border) {
  if (border && border.enabled && border.thickness > 0) {
    // 只支持纯色
    if (border.fillType === 'Color') {
      return `${px(border.thickness)} solid ${parseColor(border)}`
    } else {
      return `${NOT_SUPPORT}BORDER: ${border.fillType}`
    }
  }
}
/**
 * @param {Layer['style']['fills'][number]} fill
 */
export function parseColor(fill) {
  const { fillType, color, gradient } = fill
  if (fill.enabled === false) return
  if (fillType === "Color") return color2css(color)
  if (fillType === "Gradient") {
    const gradientType = gradient.gradientType;
    const angle = calculateGradientAngle(gradient.from, gradient.to);
    const stops = gradient.stops.map(
      stop => `${color2css(stop.color)} ${Math.round((stop.position * 100))}%`
    ).join(", ");
    if (gradientType === "Linear") {
      return `linear-gradient(${angle}deg, ${stops})`;
    } else if (gradientType === "Radial") {
      const center = `${Math.round(gradient.from.x * 100)}% ${Math.round(gradient.from.y * 100)}%`;
      return `radial-gradient(circle at ${center}, ${stops});`;
    } else if (gradientType === "Angular") {
      return `conic-gradient(from ${angle}deg, ${stops})`;
    } else {
      return `${NOT_SUPPORT}GRADIENT_COLOR: ${gradientType}`
    }
  } else {
    return `${NOT_SUPPORT}COLOR: ${fillType}`
  }
}
/**
 * @param {Layer['style']['shadows'][number]} shadow
 */
export function parseShadow(s, inset) {
  if (s.enabled) {
    const prefix = inset ? `inset ` : ''
    return `${prefix}${px(s.x)} ${px(s.y)} ${px(s.blur)} ${px(s.spread)} ${color2css(s.color)}`
  }
  return
}
/**
 * @param {Layer['style']['blur']} shadow
 */
export function parseBlur(blur) {
  if (blur.enabled) {
    if (blur.blurType === 'Gaussian') {
      if (blur.radius) return px(blur.radius)
    } else {
      return `${NOT_SUPPORT}BLUR_TYPE: ${blur.blurType}`
    }
  }
}
/**
 * @param {Layer} layer
 */
export function parseTextStyle(layer) {
  if (layer.type !== 'Text') return
  const result = {}
  const { style = {}, frame } = layer

  let ellipsisLineCount = 0
  // 计算文字是否要出现文字溢出的 ...
  if (layer.fixedWidth && style.lineHeight && frame.height) {
    result.width = px(frame.width)
    result.height = px(frame.height)
    ellipsisLineCount = Math.round(frame.height / style.lineHeight)
  } else if (layer.text && (layer.text.endsWith('...') || layer.text.endsWith('…'))) {
    if (style.lineHeight && frame.height) {
      result.height = px(frame.height)
      ellipsisLineCount = Math.round(frame.height / style.lineHeight)
    }
  }

  // sketch 复制出来的字重是一个数字，需要转化成 css 中的字重
  // fontWeight 2 => Ultralight
  // fontWeight 3 => thin / light
  // fontWeight 5 => regular
  // fontWeight 6 => medium
  // fontWeight 8 => simibold
  const fontWeightMap = { 2: 200, 3: 300, 5: 400, 6: 500, 8: 600 }
  if (style.fontFamily) {
    if (fontWeightMap[style.fontWeight] && style.fontFamily.toUpperCase().startsWith('PINGFANG')) {
      result.fontWeight = fontWeightMap[style.fontWeight]
    } else {
      result.fontFamily = style.fontFamily
    }
  }
  if (style.fontSize) result.fontSize = px(style.fontSize)
  if (style.lineHeight || frame.height) result.lineHeight = px(style.lineHeight || frame.height)
  if (style.kerning > 0) result.letterSpacing = px(style.kerning, 2)
  if (style.alignment === 'center') result.textAlign = 'center'
  if (style.textColor) result.color = color2css(style.textColor)
  if (ellipsisLineCount > 0) result.ellipsisLineCount = ellipsisLineCount
  return result
}

/**
 * 计算渐变的角度
 * @param {import('./layer').CurveFrom} from
 * @param {import('./layer').CurveFrom} to
 * @returns
 */
function calculateGradientAngle(from, to) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const angle = Math.atan2(dy, dx) * (180 / Math.PI); // Convert radians to degrees
  return Math.round((angle + 90) % 360); // Adjust so 0 degrees is top to bottom
}
/** @param {string} color */
function color2css(color) {
  if (typeof color === 'string' && color.startsWith('#')) {
    const upper = color.toUpperCase()
    if (upper.length === 9) {
      if (upper.endsWith('FF')) return upper.slice(0, 7)
      const {r, g, b, a} = hexColor2RGBA(color)
      return `rgba(${r}, ${g}, ${b}, ${a})`
    }
    return upper
  }
  return color
}
function px(num, fixed = 0) {
  if (num === 0) return num
  if (fixed === 0) {
    num = Math.round(num)
  } else {
    num = num.toFixed(fixed)
  }
  return `${num}px`
}