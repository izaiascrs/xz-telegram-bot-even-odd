import { convertTicksToCartesianDigits, convertTicksToDigits, getTickPipSize } from "../../utils/load-data";
import { Strategy, MoneyManagement, StrategyType } from "../types";

import {
  CombinationSignal,
  EntrySignal,
  PercentageSignal,
  SequenceSignal,
  PatternSignal,
  SingleDigitSignal,
  SignalValidator,
  isCartesianDigits,
} from "./signal-validator";

export const defaultManagement: MoneyManagement = {
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

export interface StrategyConfig {
  entrySignal: EntrySignal;
  compare: (digit: number) => boolean;
  compareType?: StrategyType;
  compareDigit?: number;
  compareDigit2?: number;
  description?: string;
  skipSignalWhileTrading?: boolean;
}

const defaultConfig: StrategyConfig = {
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

export class DigitCompareStrategy implements Strategy {
  name: string;
  minTicks: number;
  virtualLoss: number;
  moneyManagement: MoneyManagement;
  config: StrategyConfig;
  private digits: number[];
  private normalizedDigits: number[];
  skipSignalWhileTrading?: boolean | undefined;

  constructor(config: Partial<StrategyConfig> = {}) {
    this.config = { ...defaultConfig, ...config };
    const entrySignal = this.config.entrySignal as unknown as SingleDigitSignal;
    this.name =
      this.config.description ||
      `Dígito ${entrySignal.digit} com comparação personalizada`;
    this.minTicks = 1;
    this.virtualLoss = 1;
    this.moneyManagement = defaultManagement;
    this.digits = [];
    this.normalizedDigits = [];

    if(config.skipSignalWhileTrading !== undefined) {
      this.skipSignalWhileTrading = config.skipSignalWhileTrading;
    }
  }

  execute(ticks: number[], position: number, ticksToAnalyze: number): boolean | null {
    // 1. Primeiro verificamos se temos dígitos suficientes
    if (position + ticksToAnalyze >= ticks.length) {
      return null;
    }

    if (this.digits.length === 0) {
      const pipSize = getTickPipSize(ticks);
      const formattedTicks = ticks.map((tick) => ({ price: tick, time: 0 }));
      this.digits = 
        isCartesianDigits(this.config.entrySignal) 
          ? convertTicksToCartesianDigits(formattedTicks, pipSize) 
          : convertTicksToDigits(formattedTicks, pipSize);
      this.normalizedDigits = convertTicksToDigits(formattedTicks, pipSize);
    }

    // 2. Criamos um array com o histórico necessário para validação
    // Pegamos os últimos N dígitos até a posição atual
    const history: number[] = [];

    switch (this.config.entrySignal.type) {
      case "single":
        history.push(this.digits[position]);
        break;
      case "pattern":
        const lookback = (this.config.entrySignal.value as PatternSignal)
          .lookback;
        for (let i = 0; i < lookback && position - i >= 0; i++) {
          history.unshift(this.digits[position - i]);
        }
        break;
      case "sequence":
        const seqLength = (this.config.entrySignal.value as SequenceSignal)
          .digits.length;
        for (let i = 0; i < seqLength && position - i >= 0; i++) {
          history.unshift(this.digits[position - i]);
        }
        break;
      case "percentage":
        const percentLookback = (
          this.config.entrySignal.value as PercentageSignal
        ).lookback;
        for (let i = 0; i < percentLookback && position - i >= 0; i++) {
          history.unshift(this.digits[position - i]);
        }
        break;
      case "combination":
        const conditions = (this.config.entrySignal.value as CombinationSignal)
          .conditions;
        const maxPosition = Math.max(...conditions.map((c) => c.position));
        for (let i = 0; i <= maxPosition && position - i >= 0; i++) {
          history.unshift(this.digits[position - i]);
        }
        break;
    }

    // 3. Validamos o sinal de entrada usando o SignalValidator
    const validator = new SignalValidator();
    const isValidEntry = validator.validate(
      {
        type: this.config.entrySignal.type,
        value: this.config.entrySignal.value,
      },
      history
    );

    // 4. Se o sinal não for válido, retornamos null
    if (!isValidEntry) {
      return null;
    }
   
    // Para outros tipos, mantemos a lógica original
    const targetDigit = this.normalizedDigits[position + ticksToAnalyze];
    return this.config.compare(targetDigit);
  }

  updateManagement(management: MoneyManagement) {
    this.moneyManagement = management;
  }

  resetDigits() {
    this.digits = [];
    this.normalizedDigits = [];
  }
}
