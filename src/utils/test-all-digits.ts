import { runBackTest } from "../backtest/run-backtest";
import { DigitCompareStrategy, StrategyConfig } from "../backtest/strategies/digit-compare";
import { CompleteBackTestResult } from "../backtest/types";
import { TLoadHistoricalDataResult } from "./load-data";

export const testAllDigits = (
  strategyToTest: DigitCompareStrategy,
  historicalData: TLoadHistoricalDataResult<"ticks">
) => {
  if (!historicalData) return;

  const allDigitStrategies: DigitCompareStrategy[] = Array.from(
    { length: 10 },
    (_, i) => {
      const options: StrategyConfig = {
        ...strategyToTest.config,
        entrySignal: {
          type: "single",
          value: {
            digit: i,
          },
        },
      }
      const newStrategy = new DigitCompareStrategy(options);
      return newStrategy as DigitCompareStrategy;
    }
  );

  const results: CompleteBackTestResult[] = allDigitStrategies.map(
    (strategy) => runBackTest(historicalData, strategy, 1000)
  );

  const bestResultForEachDigit = results
    .map((result, index) => {
      const bestWinRate = result.backtest.reduce((acc, curr) => {
        return acc.winRate > curr.winRate ? acc : curr;
      });
      return { ...bestWinRate, digit: index };
    })
    .sort((a, b) => b.winRate - a.winRate);

  return bestResultForEachDigit;
};