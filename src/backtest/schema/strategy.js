"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StrategyTypeSchema = void 0;
const zod_1 = require("zod");
const strategyTypes = [
    "above",
    "below",
    "even",
    "odd",
    "match",
    "differ",
    "between",
    "call",
    "put",
];
exports.StrategyTypeSchema = zod_1.z
    .discriminatedUnion("signalType", [
    zod_1.z.object({
        signalType: zod_1.z.literal("single"),
        entryDigit: zod_1.z.number().min(0).max(9),
        strategyType: zod_1.z.enum(strategyTypes),
        compareValue: zod_1.z.number().min(0).max(9).optional(),
        compareValue2: zod_1.z.number().min(0).max(9).optional(),
    }),
    zod_1.z.object({
        signalType: zod_1.z.literal("pattern"),
        patternType: zod_1.z.enum(["digits", "evenOdd", "cartesian_digits"]),
        pattern: zod_1.z
            .array(zod_1.z.union([zod_1.z.enum(["even", "odd"]), zod_1.z.number().min(-10).max(10)]))
            .min(1)
            .max(5),
        strategyType: zod_1.z.enum(strategyTypes),
        compareValue: zod_1.z.number().min(0).max(9).optional(),
        compareValue2: zod_1.z.number().min(0).max(9).optional(),
    }),
    zod_1.z.object({
        signalType: zod_1.z.literal("percentage"),
        percentageType: zod_1.z.enum(["digit", "even", "odd", "above", "below"]),
        compareNumber: zod_1.z.number().min(0).max(9).optional(),
        percentageValue: zod_1.z.number().min(0).max(100),
        percentageCondition: zod_1.z.enum(["above", "below"]),
        lookback: zod_1.z.number().min(1).max(20),
        strategyType: zod_1.z.enum(strategyTypes),
        compareValue: zod_1.z.number().min(0).max(9).optional(),
        compareValue2: zod_1.z.number().min(0).max(9).optional(),
    }),
])
    .refine((data) => {
    if (data.strategyType === "above" && data.compareValue !== undefined) {
        return data.compareValue < 9;
    }
    if (data.strategyType === "below" && data.compareValue !== undefined) {
        return data.compareValue > 0;
    }
    if (data.strategyType === "between") {
        return (data.compareValue !== undefined &&
            data.compareValue2 !== undefined &&
            data.compareValue < data.compareValue2);
    }
    return true;
}, {
    message: "Valor de comparação inválido para este tipo de estratégia",
    path: ["compareValue"],
});
