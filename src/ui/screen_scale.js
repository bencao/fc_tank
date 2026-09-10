const MIN_SCALE = 0.25;

/**
 * How much to blow up the 600x520 game screen so it fills the space it was
 * given without spilling out of it.
 *
 * Scaling up snaps to whole numbers so every game pixel stays a perfect square
 * block - that is what keeps an upscaled CRT picture crisp instead of mushy.
 * Width is the hard limit, since nothing should scroll sideways; a short window
 * only holds the picture back from growing, it never shrinks it below life size.
 */
export function compute_scale(available_width, available_height, base_width, base_height, max_scale = 2) {
  const width_fit = available_width / base_width;
  if (width_fit < 1) { return Math.max(width_fit, MIN_SCALE); }

  const height_fit = available_height / base_height;
  return Math.max(1, Math.min(Math.floor(Math.min(width_fit, height_fit)), max_scale));
}
