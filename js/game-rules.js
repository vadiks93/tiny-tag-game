(function (root, factory) {
    const rules = factory();

    if (typeof module === 'object' && module.exports) {
        module.exports = rules;
    }

    root.GameRules = rules;
})(typeof globalThis !== 'undefined' ? globalThis : window, function () {
    function clampNumber(value, min, max, fallback) {
        return Math.min(max, Math.max(min, Number(value) || fallback));
    }

    function calculateMovementSpeed(options) {
        const baseSpeed = options.baseSpeed;
        const maxStraightBonus = options.maxStraightBonus;
        const directionChangePenalty = options.directionChangePenalty;
        const streak = options.streak;
        const isStraight = options.isStraight;
        const accelerationTicks = options.accelerationTicks;

        if (!isStraight) {
            return baseSpeed + directionChangePenalty;
        }

        const acceleration = (2 * maxStraightBonus) / (accelerationTicks * accelerationTicks);
        const straightBonus = Math.min(maxStraightBonus, 0.5 * acceleration * streak * streak);

        return baseSpeed + straightBonus + directionChangePenalty;
    }

    return { clampNumber, calculateMovementSpeed };
});
