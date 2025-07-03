"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ThreeAboveOneStrategy = exports.ThreeAboveStrategy = void 0;
const defaultManagement = {
    type: 'soros', // Vamos testar com martingale primeiro
    initialStake: 1,
    profitPercent: 22, // 22% de lucro
    maxStake: 100,
    maxLoss: 7,
    sorosLevel: 3,
    targetTick: 10,
    // Gerenciamento apenas no tick 2
    winsBeforeMartingale: 0,
    cashout: 0,
};
const defaultConfig = {
    entryDigit: 3,
    compareDigit: 1
};
class ThreeAboveStrategy {
    constructor(config = {}) {
        this.config = Object.assign(Object.assign({}, defaultConfig), config);
        this.name = `${this.config.entryDigit} Acima de ${this.config.compareDigit}`;
        this.minTicks = 1;
        this.virtualLoss = 1;
        this.moneyManagement = defaultManagement;
    }
    execute(digits, position, ticksToAnalyze) {
        // Verifica se o dígito atual é o dígito de entrada
        if (digits[position] !== this.config.entryDigit) {
            return null;
        }
        // Verifica se há dígitos suficientes para análise
        if (position + ticksToAnalyze >= digits.length) {
            return null;
        }
        // Verifica se o dígito no tick alvo é maior que o dígito de comparação
        const targetDigit = digits[position + ticksToAnalyze];
        return targetDigit > this.config.compareDigit;
    }
}
exports.ThreeAboveStrategy = ThreeAboveStrategy;
// Exporta a estratégia padrão (3 acima de 1)
exports.ThreeAboveOneStrategy = new ThreeAboveStrategy({ entryDigit: 3, compareDigit: 1 });
// Exemplo de uso com diferentes configurações:
// export const FourAboveTwoStrategy = new ThreeAboveStrategy({ entryDigit: 4, compareDigit: 2 }); 
