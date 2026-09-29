const MIN_SCALE = 0.25;

/**
 * How much to blow up the 600x520 game screen so it fills the space it was
 * given without spilling out of it.
 *
 * Scaling up snaps to whole numbers so every game pixel stays a perfect square
 * block - that is what keeps an upscaled CRT picture crisp instead of mushy.
 * Width is the hard limit, since nothing should scroll sideways; a short window
 * only holds the picture back from growing, it never shrinks it below life size.
 * Once the picture is already smaller than life (a phone), it shrinks to fit
 * the height it was given too - pass Infinity to let it scroll instead.
 */
export function compute_scale(available_width, available_height, base_width, base_height, max_scale = 2) {
  const width_fit = available_width / base_width;
  const height_fit = available_height / base_height;
  if (width_fit < 1) { return Math.max(Math.min(width_fit, height_fit), MIN_SCALE); }

  return Math.max(1, Math.min(Math.floor(Math.min(width_fit, height_fit)), max_scale));
}

/**
 * Scanline spacing, in CSS px, for a picture drawn at `scale` on a display
 * with `device_pixel_ratio` device pixels per CSS px.
 *
 * Lines are 3px apart and 1px thick at life size and up. A picture shrunk to
 * fit a phone gets proportionally finer lines, or each one covers several game
 * pixels and reads as blinds. Both measures are snapped to whole device pixels:
 * on a phone's fractional ratio a CSS pixel straddles device pixels, and lines
 * come out alternately thick and thin.
 */
export function scanline_pitch(scale, device_pixel_ratio) {
  const pitch = Math.max(2, Math.round(3 * Math.min(scale, 1) * device_pixel_ratio));
  const line = Math.min(pitch - 1, Math.max(1, Math.round(pitch / 3)));
  return { pitch: pitch / device_pixel_ratio, line: line / device_pixel_ratio };
}

/**
 * Spacing of the faint scanline haze over the whole room, in CSS px. It is
 * drawn over the picture too, so it only shows when its lines coincide with
 * the picture's; over a shrunk picture the two patterns beat into moiré - and
 * the haze is fixed to the window, so it shimmers as the page scrolls.
 */
export function room_haze(scale, device_pixel_ratio) {
  const lines = scanline_pitch(1, device_pixel_ratio);
  return scale < 1 ? { pitch: lines.pitch, line: 0 } : lines;
}
