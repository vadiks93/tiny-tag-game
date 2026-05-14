const assert = require('assert');
const rules = require('../js/game-rules');

function testClampNumber() {
    assert.strictEqual(rules.clampNumber('60', 5, 180, 30), 60);
    assert.strictEqual(rules.clampNumber('999', 5, 180, 30), 180);
    assert.strictEqual(rules.clampNumber('-2', 5, 180, 30), 5);
    assert.strictEqual(rules.clampNumber('', 5, 180, 30), 30);
}

function testMovementAcceleration() {
    const baseOptions = {
        baseSpeed: 10.6,
        maxStraightBonus: 5.2,
        directionChangePenalty: -0.9,
        accelerationTicks: 55
    };
    const firstTick = rules.calculateMovementSpeed({
        ...baseOptions,
        streak: 1,
        isStraight: true
    });
    const laterTick = rules.calculateMovementSpeed({
        ...baseOptions,
        streak: 40,
        isStraight: true
    });
    const cappedTick = rules.calculateMovementSpeed({
        ...baseOptions,
        streak: 100,
        isStraight: true
    });
    const diagonal = rules.calculateMovementSpeed({
        ...baseOptions,
        streak: 40,
        isStraight: false
    });

    assert(firstTick > 9.7);
    assert(laterTick > firstTick);
    assert.strictEqual(cappedTick, 14.9);
    assert.strictEqual(diagonal, 9.7);
}

testClampNumber();
testMovementAcceleration();

console.log('All tests passed.');
