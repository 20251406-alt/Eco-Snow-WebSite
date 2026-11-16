export type GuideBox = {
  top: number;
  left: number;
  width: number;
  height: number;
};
export type GuideViewport = GuideBox;
/** CSS-pixel coordinates only: same space as getBoundingClientRect. */
export function placeCoach(
  target: GuideBox | null,
  viewport: GuideViewport,
  naturalHeight: number,
) {
  const pad = 12,
    gap = 12;
  const width = Math.max(0, Math.min(360, viewport.width - pad * 2));
  const maxScreenHeight = Math.max(0, viewport.height - pad * 2);
  const desired = Math.min(naturalHeight, maxScreenHeight);
  const minX = viewport.left + pad,
    maxX = viewport.left + viewport.width - pad - width;
  const minY = viewport.top + pad,
    maxY = viewport.top + viewport.height - pad;
  if (!target)
    return {
      left: minX,
      top: minY,
      width,
      maxHeight: maxScreenHeight,
      side: "none",
    };
  const right = target.left + target.width,
    bottom = target.top + target.height;
  if (viewport.left + viewport.width - pad - right - gap >= width)
    return {
      left: right + gap,
      top: Math.max(minY, Math.min(target.top, maxY - desired)),
      width,
      maxHeight: maxScreenHeight,
      side: "right",
    };
  if (target.left - gap - minX >= width)
    return {
      left: target.left - gap - width,
      top: Math.max(minY, Math.min(target.top, maxY - desired)),
      width,
      maxHeight: maxScreenHeight,
      side: "left",
    };
  const below = maxY - bottom - gap,
    above = target.top - gap - minY;
  const useBelow = below >= desired || below >= above;
  const available = Math.max(0, useBelow ? below : above);
  return {
    left: Math.max(minX, Math.min(target.left, maxX)),
    top: useBelow
      ? bottom + gap
      : target.top - gap - Math.min(desired, available),
    width,
    maxHeight: available,
    side: useBelow ? "below" : "above",
  };
}
export function focusControl(element: HTMLElement, kind: string): HTMLElement {
  if (kind === "input" || kind === "change") {
    const control = element.matches("input,select,textarea")
      ? element
      : element.querySelector<HTMLElement>("input,select,textarea");
    if (
      control &&
      !(control instanceof HTMLInputElement && control.type === "checkbox")
    )
      return control;
  }
  return element;
}
