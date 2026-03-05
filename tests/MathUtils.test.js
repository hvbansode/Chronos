import { describe, it, expect } from 'vitest';
import { MathUtils } from '../src/utils/MathUtils.js';

describe('MathUtils', () => {
    describe('getAngle', () => {
        it('should convert minutes to degrees (0 mins = -90 deg)', () => {
            expect(MathUtils.getAngle(0)).toBe(-90);
        });
        it('should handle 720 mins (12h) to 90 deg', () => {
            expect(MathUtils.getAngle(720)).toBe(90);
        });
        it('should handle 1440 mins (24h) to 270 deg', () => {
            expect(MathUtils.getAngle(1440)).toBe(270);
        });
    });

    describe('getMins', () => {
        it('should convert -90 degrees to 0 mins', () => {
            expect(MathUtils.getMins(-90)).toBe(0);
        });
        it('should convert 90 degrees to 720 mins', () => {
            expect(MathUtils.getMins(90)).toBe(720);
        });
        it('should convert 270 degrees to 1440 mins', () => {
            expect(MathUtils.getMins(270)).toBe(1440);
        });
        it('should handle negative wrap-around degrees correctly', () => {
            // e.g. -180 should be equivalent to 180 (which is 270 degrees offset) = 180 + 90 = 270 / 360 * 1440
            expect(MathUtils.getMins(-180)).toBe(1080); // -180 + 90 = -90. -90 < 0 -> 270. (270/360)*1440 = 1080
        });
    });

    describe('getPt', () => {
        it('should return correct x, y coordinates based on angle and radius', () => {
            // angle 0 degrees -> right -> x = cx + r, y = cy
            const pt0 = MathUtils.getPt(0, 100, 210, 210);
            expect(pt0.x).toBeCloseTo(310);
            expect(pt0.y).toBeCloseTo(210);

            // angle 90 degrees -> down -> x = cx, y = cy + r
            const pt90 = MathUtils.getPt(90, 100, 210, 210);
            expect(pt90.x).toBeCloseTo(210);
            expect(pt90.y).toBeCloseTo(310);

            // angle -90 degrees -> up -> x = cx, y = cy - r
            const ptMinus90 = MathUtils.getPt(-90, 100, 210, 210);
            expect(ptMinus90.x).toBeCloseTo(210);
            expect(ptMinus90.y).toBeCloseTo(110);
        });
    });

    // Note: getPointerAngle relies on SVG DOM which is hard to unit test in Node without JSDOM,
    // so we skip it for these pure math unit tests.
});
