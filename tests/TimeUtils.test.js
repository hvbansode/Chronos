import { describe, it, expect, vi } from 'vitest';
import { TimeUtils } from '../src/utils/TimeUtils.js';

describe('TimeUtils', () => {
    describe('toMins', () => {
        it('should correctly parse HH:MM strings', () => {
            expect(TimeUtils.toMins('00:00')).toBe(0);
            expect(TimeUtils.toMins('12:00')).toBe(720);
            expect(TimeUtils.toMins('23:59')).toBe(1439);
        });

        it('should handle invalid string gracefully', () => {
            expect(TimeUtils.toMins(null)).toBe(0);
            expect(TimeUtils.toMins('invalid')).toBe(0);
        });
    });

    describe('toStr', () => {
        it('should correctly format minutes to HH:MM', () => {
            expect(TimeUtils.toStr(0)).toBe('00:00');
            expect(TimeUtils.toStr(720)).toBe('12:00');
            expect(TimeUtils.toStr(1439)).toBe('23:59');
        });

        it('should wrap around correctly for > 1440', () => {
            expect(TimeUtils.toStr(1445)).toBe('00:05');
        });

        it('should wrap around correctly for negative numbers', () => {
            expect(TimeUtils.toStr(-5)).toBe('23:55');
        });
    });

    describe('toDisplayTime', () => {
        it('should convert 24h to 12h AM/PM format', () => {
            expect(TimeUtils.toDisplayTime('00:00')).toBe('12:00 AM');
            expect(TimeUtils.toDisplayTime('06:30')).toBe('6:30 AM');
            expect(TimeUtils.toDisplayTime('12:00')).toBe('12:00 PM');
            expect(TimeUtils.toDisplayTime('18:45')).toBe('6:45 PM');
        });
    });
    
    describe('getCurrentMins', () => {
        it('should return current time in minutes', () => {
            // B2: useFakeTimers() MUST be called before setSystemTime()
            vi.useFakeTimers();
            const date = new Date(2024, 1, 1, 14, 30); 
            vi.setSystemTime(date);
            expect(TimeUtils.getCurrentMins()).toBe(14 * 60 + 30);
            vi.useRealTimers();
        });
    });
});
