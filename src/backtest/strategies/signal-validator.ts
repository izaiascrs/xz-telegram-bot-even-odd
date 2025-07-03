import { StrategyConfig } from "./digit-compare";

interface SignalConfig {
  type: SignalType;
  value: SignalValue;
}

type SignalType = 
  | "single" // Um único dígito
  | "pattern" // Padrão de dígitos (ex: par,impar,par)
  | "percentage" // Porcentagem de ocorrência
  | "sequence" // Sequência específica de dígitos (ex: 1,2,3)
  | "combination" // Combinação de condições
  | "trend"; // Sinal de tendência

type SignalValue = 
  | SingleDigitSignal
  | PatternSignal
  | SequenceSignal
  | CombinationSignal
  | PercentageSignal
  | TrendSignal;

export interface EntrySignal {
  type: SignalType;
  value: SignalValue;
}

// Para um único dígito
export interface SingleDigitSignal {
  digit: number;
}

// Para padrões (par/ímpar)
export interface PatternSignal {
  pattern: Array<"even" | "odd" | number>;
  lookback: number; // Quantos dígitos olhar para trás
  patternType: "digits" | "evenOdd" | "cartesian_digits";
}

// Para porcentagem
export interface PercentageSignal {
  percentageType: "digit" | "even" | "odd" | "above" | "below";
  compareNumber?: number;
  percentageValue: number;
  percentageCondition: "above" | "below";
  lookback: number;
}

// Para sequência específica
export interface SequenceSignal {
  digits: number[];
  exact: boolean; // Se precisa ser exatamente nessa ordem
}

// Para combinação de condições
export interface CombinationSignal {
  conditions: Array<{
    type: "even" | "odd" | "digit" | "range";
    value: number | [number, number];
    position: number; // Posição no histórico (0 = atual, 1 = anterior, etc)
  }>;
}

// Para sinal de tendência
export interface TrendSignal {
  lookback: number; // número de ticks para analisar (sugiro 7-8)
  minSwingPoints: number; // número mínimo de pontos de swing (sugiro 3)
  trendType: "up" | "down";
  minVariation?: number; // variação mínima para considerar um swing (sugiro 1%)
}

export class SignalValidator {
  validate(signal: SignalConfig, history: number[]): boolean {
    switch (signal.type) {
      case "single":
        return this.validateSingleDigit(signal.value as SingleDigitSignal, history);
      case "pattern":
        return this.validatePattern(signal.value as PatternSignal, history);
      case "percentage":
        return this.validatePercentage(signal.value as PercentageSignal, history);
      case "sequence":
        return this.validateSequence(signal.value as SequenceSignal, history);
      case "combination":
        return this.validateCombination(signal.value as CombinationSignal, history);
      case "trend":
        return this.validateTrend(signal.value as TrendSignal, history);
      default:
        return false;
    }
  }

  private validateSingleDigit(value: SingleDigitSignal, history: number[]): boolean {
    return history[0] === value.digit;
  }

  private validatePattern(value: PatternSignal, history: number[]): boolean {
    if (history.length < value.lookback) return false;
    
    return value.pattern.every((type, index) => {
      const digit = history[index];
      if (typeof type === "number") {
        return Object.is(digit, type);
      }
      return type === "even" ? digit % 2 === 0 : digit % 2 === 1;
    });
  }

  private validatePercentage(value: PercentageSignal, history: number[]): boolean {
    const relevantHistory = history.slice(-value.lookback);
    if (relevantHistory.length < value.lookback) return false;

    let count = 0;
    const total = relevantHistory.length;

    switch (value.percentageType) {
      case "digit":
        if (value.compareNumber === undefined) return false;
        count = relevantHistory.filter(d => d === value.compareNumber).length;
        break;
      case "even":
        count = relevantHistory.filter(d => d % 2 === 0).length;
        break;
      case "odd":
        count = relevantHistory.filter(d => d % 2 !== 0).length;
        break;
      case "above":
        if (value.compareNumber === undefined) return false;
        count = relevantHistory.filter(d => {
          return value.compareNumber !== undefined && d > value.compareNumber;
        }).length;
        break;
      case "below":
        if (value.compareNumber === undefined) return false;
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

  private validateSequence(value: SequenceSignal, history: number[]): boolean {
    if (history.length < value.digits.length) return false;
    
    return value.digits.every((digit, index) => history[index] === digit);
  }

  private validateCombination(value: CombinationSignal, history: number[]): boolean {
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
          return history[position] >= (value as number[])[0] && history[position] <= (value as number[])[1];
        default:
          return false;
      }
    });
  }

  private validateTrend(value: TrendSignal, history: number[]): boolean {
    if (history.length < value.lookback) return false;
    // Encontrar os swing points
    const swingPoints = this.findSwingPoints(history, value.minVariation || 0);
    
    if (swingPoints.length < value.minSwingPoints) return false;

    // Verificar a tendência
    if (value.trendType === "up") {
      // Verificar se os máximos estão subindo
      const highs = swingPoints.filter(point => point.type === "high");
      for (let i = 1; i < highs.length; i++) {
        if (highs[i].price <= highs[i-1].price) return false;
      }
      return true;
    } else {
      // Verificar se os mínimos estão descendo
      const lows = swingPoints.filter(point => point.type === "low");
      for (let i = 1; i < lows.length; i++) {
        if (lows[i].price >= lows[i-1].price) return false;
      }
      return true;
    }
  }

  private findSwingPoints(history: number[], minVariation: number): Array<{price: number, type: "high" | "low"}> {
    const swingPoints: Array<{price: number, type: "high" | "low"}> = [];
    
    for (let i = 1; i < history.length - 1; i++) {
      const prev = history[i-1];
      const curr = history[i];
      const next = history[i+1];

      // Verificar variação mínima
      const variation = Math.abs((curr - prev) / prev) * 100;
      if (variation < minVariation) continue;

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

export function isCartesianDigits(signal: SignalConfig) {
  return signal.type === "pattern" && (signal.value as PatternSignal).patternType === "cartesian_digits";
}

export function isTickData(signal: StrategyConfig) {
  return signal.compareType === "call" || signal.compareType === "put";
}
