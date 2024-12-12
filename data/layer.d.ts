export interface Layer {
  type:          string;
  id:            string;
  frame:         Frame;
  name:          string;
  selected:      boolean;
  hidden:        boolean;
  locked:        boolean;
  exportFormats: any[];
  transform:     Transform;
  style:         Style;
  sharedStyleId: null;
  shapeType:     string;
  layers:        Layer[];
  points:        Point[];
  closed:        boolean;
}

export interface Frame {
  x:      number;
  y:      number;
  width:  number;
  height: number;
}

export interface Point {
  type:         string;
  cornerRadius: number;
  curveFrom:    CurveFrom;
  curveTo:      CurveFrom;
  point:        CurveFrom;
  pointType:    string;
}

export interface CurveFrom {
  x: number;
  y: number;
}

export interface Style {
  type:          string;
  id:            string;
  opacity:       number;
  blendingMode:  string;
  borderOptions: BorderOptions;
  blur:          Blur;
  fills:         Fill[];
  borders:       Border[];
  shadows:       any[];
  innerShadows:  any[];
  styleType:     string;
  fontAxes:      null;
}

export interface Blur {
  center:      CurveFrom;
  motionAngle: number;
  radius:      number;
  enabled:     boolean;
  blurType:    string;
}

export interface BorderOptions {
  startArrowhead: string;
  endArrowhead:   string;
  dashPattern:    any[];
  lineEnd:        string;
  lineJoin:       string;
}

export interface Border {
  fillType:  string;
  position:  string;
  color:     string;
  gradient:  Gradient;
  thickness: number;
  enabled:   boolean;
}

export interface Gradient {
  gradientType: string;
  from:         CurveFrom;
  to:           CurveFrom;
  aspectRatio:  number;
  stops:        Stop[];
}

export interface Stop {
  position: number;
  color:    string;
}

export interface Fill {
  fillType: string;
  color:    string;
  gradient: Gradient;
  pattern:  Pattern;
  enabled:  boolean;
}

export interface Pattern {
  patternType: string;
  image:       null;
  tileScale:   number;
}

export interface Transform {
  rotation:            number;
  flippedHorizontally: boolean;
  flippedVertically:   boolean;
}