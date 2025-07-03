"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DigitCompareStrategy = exports.defaultManagement = void 0;
const load_data_1 = require("../../utils/load-data");
const signal_validator_1 = require("./signal-validator");
exports.defaultManagement = {
    type: "fixed",
    initialStake: 1,
    profitPercent: 92,
    maxStake: 100,
    maxLoss: 7,
    sorosLevel: 3,
    targetTick: 9,
    winsBeforeMartingale: 0,
    winsBeforeMartingaleMin: 0,
    lossVirtual: 0,
    cashout: 0,
};
const defaultConfig = {
    entrySignal: {
        type: "single",
        value: {
            digit: 9,
        },
    },
    compare: (digit) => digit > 1,
    description: "Dígito 9 acima de 1",
    compareType: "above",
    compareDigit: 1,
};
class DigitCompareStrategy {
    constructor(config = {}) {
        this.config = Object.assign(Object.assign({}, defaultConfig), config);
        const entrySignal = this.config.entrySignal;
        this.name =
            this.config.description ||
                `Dígito ${entrySignal.digit} com comparação personalizada`;
        this.minTicks = 1;
        this.virtualLoss = 1;
        this.moneyManagement = exports.defaultManagement;
        this.digits = [];
        this.normalizedDigits = [];
        if (config.skipSignalWhileTrading !== undefined) {
            this.skipSignalWhileTrading = config.skipSignalWhileTrading;
        }
    }
    execute(ticks, position, ticksToAnalyze) {
        // 1. Primeiro verificamos se temos dígitos suficientes
        if (position + ticksToAnalyze >= ticks.length) {
            return null;
        }
        if (this.digits.length === 0) {
            const pipSize = (0, load_data_1.getTickPipSize)(ticks);
            const formattedTicks = ticks.map((tick) => ({ price: tick, time: 0 }));
            this.digits =
                (0, signal_validator_1.isCartesianDigits)(this.config.entrySignal)
                    ? (0, load_data_1.convertTicksToCartesianDigits)(formattedTicks, pipSize)
                    : (0, load_data_1.convertTicksToDigits)(formattedTicks, pipSize);
            this.normalizedDigits = (0, load_data_1.convertTicksToDigits)(formattedTicks, pipSize);
        }
        // 2. Criamos um array com o histórico necessário para validação
        // Pegamos os últimos N dígitos até a posição atual
        const history = [];
        switch (this.config.entrySignal.type) {
            case "single":
                history.push(this.digits[position]);
                break;
            case "pattern":
                const lookback = this.config.entrySignal.value
                    .lookback;
                for (let i = 0; i < lookback && position - i >= 0; i++) {
                    history.unshift(this.digits[position - i]);
                }
                break;
            case "sequence":
                const seqLength = this.config.entrySignal.value
                    .digits.length;
                for (let i = 0; i < seqLength && position - i >= 0; i++) {
                    history.unshift(this.digits[position - i]);
                }
                break;
            case "percentage":
                const percentLookback = this.config.entrySignal.value.lookback;
                for (let i = 0; i < percentLookback && position - i >= 0; i++) {
                    history.unshift(this.digits[position - i]);
                }
                break;
            case "combination":
                const conditions = this.config.entrySignal.value
                    .conditions;
                const maxPosition = Math.max(...conditions.map((c) => c.position));
                for (let i = 0; i <= maxPosition && position - i >= 0; i++) {
                    history.unshift(this.digits[position - i]);
                }
                break;
        }
        // 3. Validamos o sinal de entrada usando o SignalValidator
        const validator = new signal_validator_1.SignalValidator();
        const isValidEntry = validator.validate({
            type: this.config.entrySignal.type,
            value: this.config.entrySignal.value,
        }, history);
        // 4. Se o sinal não for válido, retornamos null
        if (!isValidEntry) {
            return null;
        }
        // Para outros tipos, mantemos a lógica original
        const targetDigit = this.normalizedDigits[position + ticksToAnalyze];
        return this.config.compare(targetDigit);
    }
    updateManagement(management) {
        this.moneyManagement = management;
    }
    resetDigits() {
        this.digits = [];
        this.normalizedDigits = [];
    }
}
exports.DigitCompareStrategy = DigitCompareStrategy;
