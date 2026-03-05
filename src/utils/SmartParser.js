/**
 * Smart Parser for Natural Language Time Input
 */
export const SmartParser = {
    /**
     * Parse "10am", "18:00", etc.
     */
    parseTime: (input) => {
        const ampmRegex = /\b((?:1[0-2]|0?[1-9])(?::([0-5][0-9]))?)\s*(am|pm)\b/i;
        const match12 = input.match(ampmRegex);
        if (match12) {
            let h = parseInt(match12[1].split(':')[0]);
            const m = match12[2] ? parseInt(match12[2]) : 0;
            const mer = match12[3].toLowerCase();
            if (h === 12) h = 0;
            if (mer === 'pm') h += 12;
            return { mins: h * 60 + m, text: match12[0] };
        }

        const time24Regex = /\b([0-1]?[0-9]|2[0-3])[:.]([0-5][0-9])\b/;
        const match24 = input.match(time24Regex);
        if (match24) {
            const h = parseInt(match24[1]);
            const m = parseInt(match24[2]);
            return { mins: h * 60 + m, text: match24[0] };
        }
        return null;
    },

    /**
     * Parse "30m", "1h", "1.5 hours"
     */
    parseDuration: (input) => {
        const durRegex = /\b(\d+(?:\.\d+)?)\s*(h|hr|hours?|m|min|minutes?)\b/i;
        const match = input.match(durRegex);
        if (match) {
            const val = parseFloat(match[1]);
            const unit = match[2].toLowerCase();
            let mins = val;
            if (unit.startsWith('h')) mins = val * 60;
            return { mins: Math.round(mins), text: match[0] };
        }
        return null;
    }
};
