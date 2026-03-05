import { describe, it, expect } from 'vitest';
import { SmartParser } from '../src/utils/SmartParser.js';

describe('SmartParser', () => {
    describe('parseTime', () => {
        it('should parse 12-hour AM format', () => {
            const result = SmartParser.parseTime('gym 6am');
            expect(result).not.toBeNull();
            expect(result.mins).toBe(6 * 60);
        });

        it('should parse 12-hour PM format', () => {
            const result = SmartParser.parseTime('Meeting 3:30pm');
            expect(result).not.toBeNull();
            expect(result.mins).toBe(15 * 60 + 30);
        });

        it('should parse 12pm as noon (720 mins)', () => {
            const result = SmartParser.parseTime('Lunch 12pm');
            expect(result).not.toBeNull();
            expect(result.mins).toBe(720);
        });

        it('should parse 12am as midnight (0 mins)', () => {
            const result = SmartParser.parseTime('Sleep 12am');
            expect(result).not.toBeNull();
            expect(result.mins).toBe(0);
        });

        it('should parse 24-hour time format', () => {
            const result = SmartParser.parseTime('Standup 14:00');
            expect(result).not.toBeNull();
            expect(result.mins).toBe(14 * 60);
        });

        it('should return null when no time is present', () => {
            const result = SmartParser.parseTime('Go grocery shopping');
            expect(result).toBeNull();
        });
    });

    describe('parseDuration', () => {
        it('should parse "30m" as 30 minutes', () => {
            const result = SmartParser.parseDuration('Gym 30m');
            expect(result).not.toBeNull();
            expect(result.mins).toBe(30);
        });

        it('should parse "1h" as 60 minutes', () => {
            const result = SmartParser.parseDuration('Lunch 1h');
            expect(result).not.toBeNull();
            expect(result.mins).toBe(60);
        });

        it('should parse "1.5h" as 90 minutes', () => {
            const result = SmartParser.parseDuration('Yoga 1.5h');
            expect(result).not.toBeNull();
            expect(result.mins).toBe(90);
        });

        it('should parse "90 minutes" as 90 minutes', () => {
            const result = SmartParser.parseDuration('Run 90 minutes');
            expect(result).not.toBeNull();
            expect(result.mins).toBe(90);
        });

        it('should return null when no duration is present', () => {
            const result = SmartParser.parseDuration('Call John');
            expect(result).toBeNull();
        });
    });
});
