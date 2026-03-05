/**
 * Time Utilities
 */
export const TimeUtils = {
    /**
     * Convert "HH:MM" string to minutes from midnight
     */
    toMins: (t) => {
        if (!t || typeof t !== 'string') return 0;
        const parts = t.split(':');
        if (parts.length < 2) return 0;
        const h = parseInt(parts[0], 10) || 0;
        const m = parseInt(parts[1], 10) || 0;
        return h * 60 + m;
    },

    /**
     * Convert minutes to "HH:MM" string
     */
    toStr: (m) => {
        let mm = Math.floor(m);
        if (mm < 0) mm += 1440;
        if (mm >= 1440) mm %= 1440;
        return `${String(Math.floor(mm / 60)).padStart(2, '0')}:${String(mm % 60).padStart(2, '0')}`;
    },

    /**
     * Convert string "HH:MM" to "H:MM AM/PM"
     */
    toDisplayTime: (s) => {
        if (!s) return '--:--';
        const [hStr, mStr] = s.split(':');
        const h = parseInt(hStr, 10);
        return `${h % 12 || 12}:${mStr} ${h >= 12 ? 'PM' : 'AM'}`;
    },

    /**
     * Helper to get current minutes of the day
     */
    getCurrentMins: () => {
        const now = new Date();
        return now.getHours() * 60 + now.getMinutes();
    }
};
