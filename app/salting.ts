/** Quantity arithmetic only. The caller supplies a verified product/field rate. */
export function calculateSalting(depth: string, area: string, rate: string): number | null {
  const values = [depth, area, rate];
  if (values.some((value) => value.trim() === "" || !Number.isFinite(Number(value)))) return null;
  const [snowCm, squareMetres, gramsPerSquareMetre] = values.map(Number);
  if (snowCm < 0 || squareMetres <= 0 || gramsPerSquareMetre <= 0) return null;
  const kilograms = snowCm === 0 ? 0 : squareMetres * gramsPerSquareMetre / 1000;
  return Number.isFinite(kilograms) ? kilograms : null;
}
