import { z } from "zod";
import { StrategyType } from "../types";

const strategyTypes: StrategyType[] = [
  "above",
  "below",
  "even",
  "odd",
  "match",
  "differ",
  "between",
  "call",
  "put",
] as const;

export const StrategyTypeSchema = z
  .discriminatedUnion("signalType", [
    z.object({
      signalType: z.literal("single"),
      entryDigit: z.number().min(0).max(9),
      strategyType: z.enum(strategyTypes as [StrategyType, ...StrategyType[]]),
      compareValue: z.number().min(0).max(9).optional(),
      compareValue2: z.number().min(0).max(9).optional(),
    }),
    z.object({
      signalType: z.literal("pattern"),
      patternType: z.enum(["digits", "evenOdd", "cartesian_digits"]),
      pattern: z
        .array(z.union([z.enum(["even", "odd"]), z.number().min(-10).max(10)]))
        .min(1)
        .max(5),
      strategyType: z.enum(strategyTypes as [StrategyType, ...StrategyType[]]),
      compareValue: z.number().min(0).max(9).optional(),
      compareValue2: z.number().min(0).max(9).optional(),
    }),
    z.object({
      signalType: z.literal("percentage"),
      percentageType: z.enum(["digit", "even", "odd", "above", "below"]),
      compareNumber: z.number().min(0).max(9).optional(),
      percentageValue: z.number().min(0).max(100),
      percentageCondition: z.enum(["above", "below"]),
      lookback: z.number().min(1).max(20),
      strategyType: z.enum(strategyTypes as [StrategyType, ...StrategyType[]]),
      compareValue: z.number().min(0).max(9).optional(),
      compareValue2: z.number().min(0).max(9).optional(),
    }),
  ])
  .refine(
    (data) => {
      if (data.strategyType === "above" && data.compareValue !== undefined) {
        return data.compareValue < 9;
      }
      if (data.strategyType === "below" && data.compareValue !== undefined) {
        return data.compareValue > 0;
      }
      if (data.strategyType === "between") {
        return (
          data.compareValue !== undefined &&
          data.compareValue2 !== undefined &&
          data.compareValue < data.compareValue2
        );
      }
      return true;
    },
    {
      message: "Valor de comparação inválido para este tipo de estratégia",
      path: ["compareValue"],
    }
  );

export type StrategyOptions = z.infer<typeof StrategyTypeSchema>;
