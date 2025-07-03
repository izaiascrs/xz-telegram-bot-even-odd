import { generateStrategyDescription, getEntrySignal, getStrategyComparator } from "../utils/digit-strategy";
import { loadHistoricalData } from "../utils/load-data";
import { testAllDigits } from "../utils/test-all-digits";
import { StrategyOptions } from "./schema/strategy";
import { DigitCompareStrategy } from "./strategies/digit-compare";
import { StrategyType } from "./types";

const values: StrategyOptions = {
  signalType: "single",
  strategyType: "even",
  entryDigit: 1,
}


function getStrategyOptions(values: StrategyOptions) {
  const strategyOptionsConvertedOptions = {
    entrySignal: getEntrySignal(values),
    compare: getStrategyComparator(values),
    description: generateStrategyDescription(values),
    compareType: values.strategyType as StrategyType,
    compareDigit: values.compareValue,
    compareDigit2: values.compareValue2,
  };
  return strategyOptionsConvertedOptions;
}

export async function getBackTestAllDigits(symbol: string, type: "even" | "odd") {
  const strategyOptions = getStrategyOptions({ ...values, strategyType: type });
  const strategy = new DigitCompareStrategy(strategyOptions);

  const data = await loadHistoricalData({
    symbol: symbol,
    count: 3600,  // 2 hours
    format: 'ticks'
  });

  const results = testAllDigits(strategy, data);
  return results;
}
