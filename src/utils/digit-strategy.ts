import { StrategyOptions } from "../backtest/schema/strategy";
import { EntrySignal } from "../backtest/strategies/signal-validator";
import { StrategyType } from "../backtest/types";
import { comparators } from "./comparators";


interface StrategyConfig {
  signalType: "single" | "pattern" | "percentage";
  strategyType: StrategyType;
  compareValue?: number;
  compareValue2?: number;
}

export const getEntrySignal = (values: StrategyOptions): EntrySignal => {
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

export const isTickStrategy = (values: StrategyOptions): boolean => {
  return values.strategyType === "put" || values.strategyType === "call";
};

export function getStrategyComparator(strategy: StrategyConfig) {
  const { strategyType, compareValue, compareValue2 } = strategy;

  switch (strategyType) {
    case "above":
      return comparators.above(compareValue || 0);
    case "below":
      return comparators.below(compareValue || 9);
    case "even":
      return comparators.even;
    case "odd":
      return comparators.odd;
    case "match":
      return comparators.equal(compareValue || 0);
    case "differ":
      return comparators.notEqual(compareValue || 0);
    case "between":
      return comparators.between(compareValue || 0, compareValue2 || 9);
    case "call":
      return comparators.call(compareValue || 0);
    case "put":
      return comparators.put(compareValue || 0);
    default:
      return () => false;
  }
}

export const generateStrategyDescription = (values: StrategyOptions) => {
  const { strategyType, compareValue, compareValue2 } = values;
  const signalDescription =
    values.signalType === "single"
      ? `Dígito ${values.entryDigit}`
      : values.signalType === "pattern"
      ? `Padrão ${values.pattern
          .map((p) =>
            typeof p === "number" ? p : p === "even" ? "Par" : "Ímpar"
          )
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

  const descriptions: Record<StrategyType, string> = {
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
