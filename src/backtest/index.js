"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getBackTestAllDigits = getBackTestAllDigits;
const digit_strategy_1 = require("../utils/digit-strategy");
const load_data_1 = require("../utils/load-data");
const test_all_digits_1 = require("../utils/test-all-digits");
const digit_compare_1 = require("./strategies/digit-compare");
const values = {
    signalType: "single",
    strategyType: "even",
    entryDigit: 1,
};
function getStrategyOptions(values) {
    const strategyOptionsConvertedOptions = {
        entrySignal: (0, digit_strategy_1.getEntrySignal)(values),
        compare: (0, digit_strategy_1.getStrategyComparator)(values),
        description: (0, digit_strategy_1.generateStrategyDescription)(values),
        compareType: values.strategyType,
        compareDigit: values.compareValue,
        compareDigit2: values.compareValue2,
    };
    return strategyOptionsConvertedOptions;
}
function getBackTestAllDigits(symbol, type) {
    return __awaiter(this, void 0, void 0, function* () {
        const strategyOptions = getStrategyOptions(Object.assign(Object.assign({}, values), { strategyType: type }));
        const strategy = new digit_compare_1.DigitCompareStrategy(strategyOptions);
        const data = yield (0, load_data_1.loadHistoricalData)({
            symbol: symbol,
            count: 3600, // 2 hours
            format: 'ticks'
        });
        const results = (0, test_all_digits_1.testAllDigits)(strategy, data);
        return results;
    });
}
