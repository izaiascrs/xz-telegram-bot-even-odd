"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SignalValidator = void 0;
exports.isCartesianDigits = isCartesianDigits;
exports.isTickData = isTickData;
class SignalValidator {
    validate(signal, history) {
        switch (signal.type) {
            case "single":
                return this.validateSingleDigit(signal.value, history);
            case "pattern":
                return this.validatePattern(signal.value, history);
            case "percentage":
                return this.validatePercentage(signal.value, history);
            case "sequence":
                return this.validateSequence(signal.value, history);
            case "combination":
                return this.validateCombination(signal.value, history);
            case "trend":
                return this.validateTrend(signal.value, history);
            default:
                return false;
        }
    }
    validateSingleDigit(value, history) {
        return history[0] === value.digit;
    }
    validatePattern(value, history) {
        if (history.length < value.lookback)
            return false;
        return value.pattern.every((type, index) => {
            const digit = history[index];
            if (typeof type === "number") {
                return Object.is(digit, type);
            }
            return type === "even" ? digit % 2 === 0 : digit % 2 === 1;
        });
    }
    validatePercentage(value, history) {
        const relevantHistory = history.slice(-value.lookback);
        if (relevantHistory.length < value.lookback)
            return false;
        let count = 0;
        const total = relevantHistory.length;
        switch (value.percentageType) {
            case "digit":
                if (value.compareNumber === undefined)
                    return false;
                count = relevantHistory.filter(d => d === value.compareNumber).length;
                break;
            case "even":
                count = relevantHistory.filter(d => d % 2 === 0).length;
                break;
            case "odd":
                count = relevantHistory.filter(d => d % 2 !== 0).length;
                break;
            case "above":
                if (value.compareNumber === undefined)
                    return false;
                count = relevantHistory.filter(d => {
                    return value.compareNumber !== undefined && d > value.compareNumber;
                }).length;
                break;
            case "below":
                if (value.compareNumber === undefined)
                    return false;
                count = relevantHistory.filter(d => {
                    return value.compareNumber !== undefined && d < value.compareNumber;
                }).length;
                break;
        }
        const percentage = (count / total) * 100;
        return value.percentageCondition === "above"
            ? percentage > value.percentageValue
            : percentage < value.percentageValue;
    }
    validateSequence(value, history) {
        if (history.length < value.digits.length)
            return false;
        return value.digits.every((digit, index) => history[index] === digit);
    }
    validateCombination(value, history) {
        return value.conditions.every(condition => {
            const { type, value, position } = condition;
            switch (type) {
                case "even":
                    return history[position] % 2 === 0;
                case "odd":
                    return history[position] % 2 === 1;
                case "digit":
                    return history[position] === value;
                case "range":
                    return history[position] >= value[0] && history[position] <= value[1];
                default:
                    return false;
            }
        });
    }
    validateTrend(value, history) {
        if (history.length < value.lookback)
            return false;
        // Encontrar os swing points
        const swingPoints = this.findSwingPoints(history, value.minVariation || 0);
        if (swingPoints.length < value.minSwingPoints)
            return false;
        // Verificar a tendência
        if (value.trendType === "up") {
            // Verificar se os máximos estão subindo
            const highs = swingPoints.filter(point => point.type === "high");
            for (let i = 1; i < highs.length; i++) {
                if (highs[i].price <= highs[i - 1].price)
                    return false;
            }
            return true;
        }
        else {
            // Verificar se os mínimos estão descendo
            const lows = swingPoints.filter(point => point.type === "low");
            for (let i = 1; i < lows.length; i++) {
                if (lows[i].price >= lows[i - 1].price)
                    return false;
            }
            return true;
        }
    }
    findSwingPoints(history, minVariation) {
        const swingPoints = [];
        for (let i = 1; i < history.length - 1; i++) {
            const prev = history[i - 1];
            const curr = history[i];
            const next = history[i + 1];
            // Verificar variação mínima
            const variation = Math.abs((curr - prev) / prev) * 100;
            if (variation < minVariation)
                continue;
            // Identificar swing high
            if (curr > prev && curr > next) {
                swingPoints.push({ price: curr, type: "high" });
            }
            // Identificar swing low
            else if (curr < prev && curr < next) {
                swingPoints.push({ price: curr, type: "low" });
            }
        }
        return swingPoints;
    }
}
exports.SignalValidator = SignalValidator;
function isCartesianDigits(signal) {
    return signal.type === "pattern" && signal.value.patternType === "cartesian_digits";
}
function isTickData(signal) {
    return signal.compareType === "call" || signal.compareType === "put";
}
