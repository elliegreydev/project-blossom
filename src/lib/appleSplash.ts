export interface SplashSize {
  width: number;
  height: number;
  dpr: number;
}

// Covers portrait iPhone screens from the 6s through the 16 Pro Max - the
// manifest locks orientation to portrait, so landscape variants aren't needed.
export const SPLASH_SIZES: SplashSize[] = [
  { width: 1290, height: 2796, dpr: 3 }, // 16/15/14 Pro Max
  { width: 1179, height: 2556, dpr: 3 }, // 16 Pro/16/15 Pro/15/14 Pro
  { width: 1284, height: 2778, dpr: 3 }, // 14 Plus/13/12 Pro Max
  { width: 1170, height: 2532, dpr: 3 }, // 14/13/13 Pro/12/12 Pro
  { width: 1125, height: 2436, dpr: 3 }, // 13 mini/12 mini/X/XS/11 Pro
  { width: 828, height: 1792, dpr: 2 }, // 11/XR
  { width: 750, height: 1334, dpr: 2 }, // SE 2nd/3rd gen, 8, 7, 6s
];

export function splashDims(size: SplashSize): string {
  return `${size.width}x${size.height}`;
}

export function splashMedia(size: SplashSize): string {
  const logicalWidth = size.width / size.dpr;
  const logicalHeight = size.height / size.dpr;
  return `(device-width: ${logicalWidth}px) and (device-height: ${logicalHeight}px) and (-webkit-device-pixel-ratio: ${size.dpr}) and (orientation: portrait)`;
}
