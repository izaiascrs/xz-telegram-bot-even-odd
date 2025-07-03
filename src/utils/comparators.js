"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.comparators = void 0;
// Funções utilitárias para comparações comuns
exports.comparators = {
    above: (value) => (digit) => digit > value,
    below: (value) => (digit) => digit < value,
    equal: (value) => (digit) => digit === value,
    notEqual: (value) => (digit) => digit !== value,
    even: (digit) => digit % 2 === 0,
    odd: (digit) => digit % 2 === 1,
    multipleOf: (value) => (digit) => digit % value === 0,
    between: (min, max) => (digit) => {
        const minValue = Math.min(min, max);
        const maxValue = Math.max(min, max);
        return digit < minValue || digit > maxValue;
    },
    call: (entryTick) => (currentTick) => currentTick > entryTick,
    put: (entryTick) => (currentTick) => currentTick < entryTick,
};
