"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateStake = calculateStake;
let cells = [];
const resultTable = {};
function getNumFromTable({ entry, first = false, loses, performance, wins }) {
    const i1 = entry - performance;
    const sub = (first ? 0 : 1);
    const resultIndex = i1 - sub - loses;
    const cellIndex = performance - (first ? 2 : 1) - wins;
    const cell = cells[cellIndex];
    const multiplier = +resultTable[cell + resultIndex];
    if (multiplier)
        return multiplier;
    return performance === 1 ? 1 : multiplier;
}
function generateArrayCells(arrLength) {
    const alpha = Array.from(Array(arrLength)).map((_, i) => i + 65);
    const alphabet = alpha.map((x) => String.fromCharCode(x));
    return alphabet;
}
function createTableToCalcStake(performance, entry, payout) {
    let lastNum;
    for (let i = 0; i < performance; i++) {
        const cell = cells[i - 1];
        const currentCell = cells[i];
        for (let j = 0; j < entry; j++) {
            const resultIndex = cell + j;
            lastNum = resultTable[resultIndex] || 1;
            if (performance - (performance - (i + 1)) === entry - (entry - (j + i + 1))) {
                resultTable[currentCell + j] = Math.pow(payout, entry - (entry - (i + 1)));
            }
            else {
                const calculation = ((payout * +resultTable[currentCell + (j - 1)] * lastNum) /
                    (+resultTable[currentCell + (j - 1)] + (payout - 1) * lastNum)).toFixed(10);
                resultTable[currentCell + j] = +Number(calculation).toFixed(8);
            }
        }
    }
}
function calculateStake({ entry, loses, payout, performance, profit, wins }) {
    cells = generateArrayCells(performance);
    createTableToCalcStake(performance, entry, payout);
    let firstMultiplier = getNumFromTable({ first: true, loses, wins, entry, performance });
    const secondMultiplier = getNumFromTable({ entry, performance, wins, loses });
    let thirdMultiplier = getNumFromTable({ first: true, entry, performance, wins, loses });
    if (isNaN(firstMultiplier))
        firstMultiplier = 1;
    if (isNaN(thirdMultiplier))
        thirdMultiplier = 1;
    const stake = +((1 -
        (payout * firstMultiplier)
            / (secondMultiplier + (payout - 1)
                * thirdMultiplier))
        * profit).toFixed(2);
    if (isNaN(stake) || stake <= 0) {
        return { stake: profit > 0 ? profit : 0 };
    }
    return { stake };
}
