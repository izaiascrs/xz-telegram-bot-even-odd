"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateStrategyDescription = exports.isTickStrategy = exports.getEntrySignal = void 0;
exports.getStrategyComparator = getStrategyComparator;
const comparators_1 = require("./comparators");
const getEntrySignal = (values) => {
    if (values.signalType === "single") {
        return {
            type: "single",
            value: {
                digit: values.entryDigit,
            },
        };
    }
    if (values.signalType === "pattern") {
        return {
            type: "pattern",
            value: {
                pattern: values.pattern,
                lookback: values.pattern.length,
                patternType: values.patternType,
            },
        };
    }
    return {
        type: "percentage",
        value: {
            percentageType: values.percentageType,
            compareNumber: values.compareNumber,
            percentageValue: values.percentageValue,
            percentageCondition: values.percentageCondition,
            lookback: values.lookback,
        },
    };
};
exports.getEntrySignal = getEntrySignal;
const isTickStrategy = (values) => {
    return values.strategyType === "put" || values.strategyType === "call";
};
exports.isTickStrategy = isTickStrategy;
function getStrategyComparator(strategy) {
    const { strategyType, compareValue, compareValue2 } = strategy;
    switch (strategyType) {
        case "above":
            return comparators_1.comparators.above(compareValue || 0);
        case "below":
            return comparators_1.comparators.below(compareValue || 9);
        case "even":
            return comparators_1.comparators.even;
        case "odd":
            return comparators_1.comparators.odd;
        case "match":
            return comparators_1.comparators.equal(compareValue || 0);
        case "differ":
            return comparators_1.comparators.notEqual(compareValue || 0);
        case "between":
            return comparators_1.comparators.between(compareValue || 0, compareValue2 || 9);
        case "call":
            return comparators_1.comparators.call(compareValue || 0);
        case "put":
            return comparators_1.comparators.put(compareValue || 0);
        default:
            return () => false;
    }
}
const generateStrategyDescription = (values) => {
    const { strategyType, compareValue, compareValue2 } = values;
    const signalDescription = values.signalType === "single"
        ? `Dígito ${values.entryDigit}`
        : values.signalType === "pattern"
            ? `Padrão ${values.pattern
                .map((p) => typeof p === "number" ? p : p === "even" ? "Par" : "Ímpar")
                .join(", ")}`
            : values.signalType === "percentage"
                ? values.percentageType === "digit"
                    ? `${values.percentageValue}% de ${values.compareNumber} nos últimos ${values.lookback} dígitos`
                    : values.percentageType === "even"
                        ? `${values.percentageValue}% de pares nos últimos ${values.lookback} dígitos`
                        : values.percentageType === "odd"
                            ? `${values.percentageValue}% de ímpares nos últimos ${values.lookback} dígitos`
                            : values.percentageType === "above"
                                ? `${values.percentageValue}% de dígitos acima de ${values.compareNumber} nos últimos ${values.lookback} dígitos`
                                : `${values.percentageValue}% de dígitos abaixo de ${values.compareNumber} nos últimos ${values.lookback} dígitos`
                : "";
    const descriptions = {
        above: `Sinal: ${signalDescription} | Comparação: dígito MAIOR que ${compareValue}`,
        below: `Sinal: ${signalDescription} | Comparação: dígito MENOR que ${compareValue}`,
        even: `Sinal: ${signalDescription} | Comparação: dígito PAR`,
        odd: `Sinal: ${signalDescription} | Comparação: dígito ÍMPAR`,
        match: `Sinal: ${signalDescription} | Comparação: dígito IGUAL a ${compareValue}`,
        differ: `Sinal: ${signalDescription} | Comparação: dígito DIFERENTE de ${compareValue}`,
        between: `Sinal: ${signalDescription} | Comparação: dígito ENTRE ${compareValue} e ${compareValue2}`,
        multipleOf: `Sinal: ${signalDescription} | Comparação: dígito MÚLTIPLO de ${compareValue}`,
        call: `Sinal: ${signalDescription} | Comparação: SOBE`,
        put: `Sinal: ${signalDescription} | Comparação: DESCE`,
    };
    return descriptions[strategyType];
};
exports.generateStrategyDescription = generateStrategyDescription;
