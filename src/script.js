import { layer2json } from './layer2json';
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
  if (layer) copyToClipboard(getEnhancedCSS(layer));
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
  const style = layer.style || {}
  const frame = layer.frame || {}
  const points = layer.points || []
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

    let isRectangleCopied = false
    // 只复制首次出现的矩形，否则代码中会出现太多矩形了
    const codes = layers.map(l => {
      const prefix = `/* ${l.type}: ${l.text || l.name} */`
      const code = getEnhancedCSS(l)
      const isRectangle = l.type !== 'Text' && code
      if (isRectangle) {
        if (isRectangleCopied) return
        else isRectangleCopied = true
      }
      if (code) return `${prefix}\n${code}`
    }).filter(Boolean)
    return codes.join('\n\n')
  } else if (layer.type === 'Text') {
    let ellipsisLineCount = 0
    // 计算文字是否要出现文字溢出的 ...
    if (layer.fixedWidth && style.lineHeight && frame.height) {
      result.push(`width: ${frame.width}px;`)
      result.push(`height: ${frame.height}px;`)
      ellipsisLineCount = Math.round(frame.height / style.lineHeight)
    } else if (layer.text && (layer.text.endsWith('...') || layer.text.endsWith('…'))) {
      if (style.lineHeight && frame.height) {
        result.push(`height: ${frame.height}px;`)
        ellipsisLineCount = Math.round(frame.height / style.lineHeight)
      }
    }
    result.push(...font(style, frame))
    result.push(...ellipsis(ellipsisLineCount))
  } else if (layer.type === 'Rectangle' || layer.shapeType === 'Rectangle') {
    if (frame.width) result.push(`width: ${frame.width}px;`)
    if (frame.height) result.push(`height: ${frame.height}px;`)
    if (points.length === 4) {
      const borderRadius = points.map(p => p.cornerRadius)
      if (borderRadius.every(r => typeof r === 'number')) {
        if (borderRadius.every(r => r === borderRadius[0])) {
          if (borderRadius[0] !== 0) {
            result.push(`border-radius: ${borderRadius[0]}px;`)
          }
        } else {
          result.push(`border-radius: ${borderRadius.map(r => `${r}px`).join(' ')};`)
        }
      }
    }

    const colors = (style.fills || []).filter(f => f.enabled).reverse().map(fill2css).filter(c => !!c)
    if (colors.length) {
      result.push(`background: ${colors.join(', ')};`)
    }

    if (style.borders) {
      result.push(...borders(style.borders))
    }
  }
  return result.map(l => l + '\n').join('')
}
/** @param {import('./layer').Border[]} borders */
function borders(borders) {
  const result = []
  const all = borders.filter(b => b.enabled)
  const border = all.find(b => b.fillType === 'Color')
  if (border) {
    if (border.position === 'Inside') {
      result.push(`box-sizing: border-box;`)
    }
    result.push(`border: ${all[0].thickness}px solid ${fill2css(all[0])};`)
  }
  return result
}
/**
 * @param {import('./layer').Style} style
 * @param {import('./layer').Frame} frame
 */
function font(style, frame) {
  const result = []
  if (style.fontSize) result.push(`font-size: ${style.fontSize}px;`)

  // sketch 复制出来的字重是一个数字，需要转化成 css 中的字重
  // fontWeight 2 => Ultralight
  // fontWeight 3 => thin / light
  // fontWeight 5 => regular
  // fontWeight 6 => medium
  // fontWeight 8 => simibold
  const fontWeightMap = { 2: '200', 3: '300', 5: '400', 6: '500', 8: '600' }
  if (style.fontFamily) {
    if (fontWeightMap[style.fontWeight] && style.fontFamily.toUpperCase().startsWith('PINGFANG')) {
      result.push(`font-weight: ${fontWeightMap[style.fontWeight]};`)
    } else {
      result.push(`font-family: ${style.fontFamily};`)
    }
  }
  if (style.lineHeight || frame.height) result.push(`line-height: ${style.lineHeight || frame.height}px;`)
  if (style.kerning > 0) result.push(`letter-spacing: ${style.kerning}px;`)
  if (style.alignment === 'center') result.push(`text-align: center;`)
  if (style.textColor) result.push(`color: ${color2css(style.textColor)};`)

  return result
}
function ellipsis(lineCount) {
  const result = []
  if (lineCount === 1) {
    result.push(`overflow: hidden;`)
    result.push(`text-overflow: ellipsis;`)
    result.push(`white-space: nowrap;`)
  } else if (lineCount > 1) {
    result.push(`display: -webkit-box;`)
    result.push(`overflow: hidden;`)
    result.push(`-webkit-box-orient: vertical;`)
    result.push(`-webkit-line-clamp: ${lineCount};`)
  }
  return result
}
/** @param {string} color */
function color2css(color) {
  if (typeof color === 'string' && color.startsWith('#')) {
    const upper = color.toUpperCase()
    if (upper.length === 9) {
      if (upper.endsWith('FF')) return upper.slice(0, 7)
      const r = parseInt(upper.slice(1, 3), 16)
      const g = parseInt(upper.slice(3, 5), 16)
      const b = parseInt(upper.slice(5, 7), 16)
      const a = parseInt(upper.slice(7, 9), 16) / 255
      return `rgba(${r}, ${g}, ${b}, ${a === 0 ? 0 : a.toFixed(2)})`
    }
    return upper
  }
  return color
}
/** @param {import('./layer').Fill} fill */
function fill2css(fill) {
  const { fillType, color, gradient } = fill
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
    }
  }
  return '';
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

function copyToClipboard(text) {
  const pasteboard = NSPasteboard.generalPasteboard();
  pasteboard.declareTypes_owner([NSPasteboardTypeString], null);
  pasteboard.setString_forType(text, NSPasteboardTypeString);
}