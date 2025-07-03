"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.testAllDigits = void 0;
const run_backtest_1 = require("../backtest/run-backtest");
const digit_compare_1 = require("../backtest/strategies/digit-compare");
const testAllDigits = (strategyToTest, historicalData) => {
    if (!historicalData)
        return;
    const allDigitStrategies = Array.from({ length: 10 }, (_, i) => {
        const options = Object.assign(Object.assign({}, strategyToTest.config), { entrySignal: {
                type: "single",
                value: {
                    digit: i,
                },
            } });
        const newStrategy = new digit_compare_1.DigitCompareStrategy(options);
        return newStrategy;
    });
    const results = allDigitStrategies.map((strategy) => (0, run_backtest_1.runBackTest)(historicalData, strategy, 1000));
    const bestResultForEachDigit = results
        .map((result, index) => {
        const bestWinRate = result.backtest.reduce((acc, curr) => {
            return acc.winRate > curr.winRate ? acc : curr;
        });
        return Object.assign(Object.assign({}, bestWinRate), { digit: index });
    })
        .sort((a, b) => b.winRate - a.winRate);
    return bestResultForEachDigit;
};
exports.testAllDigits = testAllDigits;
