/**
 * Math Utilities for Circular Geometry
 */
export const MathUtils = {
  /**
   * Convert minutes (0-1440) to degrees (-90 to 270)
   */
  getAngle: (mins) => (mins / 1440) * 360 - 90,

  /**
   * Convert degrees to minutes
   */
  getMins: (angle) => {
    let d = angle + 90;
    if (d < 0) d += 360;
    return (d / 360) * 1440;
  },

  /**
   * Get x,y coordinates from degrees and radius
   * @param {number} d - degrees
   * @param {number} r - radius
   * @param {number} cx - center x
   * @param {number} cy - center y
   */
  getPt: (d, r, cx = 210, cy = 210) => {
    const rad = (d * Math.PI) / 180;
    return {
      x: cx + r * Math.cos(rad),
      y: cy + r * Math.sin(rad),
    };
  },

  /**
   * Calculate angle from center to pointer
   * @param {number} clientX
   * @param {number} clientY
   * @param {SVGSVGElement} svg
   * @param {number} cx
   * @param {number} cy
   */
  getPointerAngle: (clientX, clientY, svg, cx = 210, cy = 210) => {
    const p = svg.createSVGPoint();
    p.x = clientX;
    p.y = clientY;
    const l = p.matrixTransform(svg.getScreenCTM().inverse());
    return (Math.atan2(l.y - cy, l.x - cx) * 180) / Math.PI;
  },
};
