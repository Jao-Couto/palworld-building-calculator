/**
 * Recipes can require fractional per-unit ingredient quantities (batch
 * recipes normalized to "per 1 unit produced"), but in-game you can only
 * gather/craft whole items - so quantities are always rounded up for display.
 * The epsilon guards against floating-point noise (e.g. 4.9999999999) being
 * bumped up to the next integer.
 */
export function formatQuantity(quantity: number): number {
  return Math.ceil(quantity - 1e-9);
}
