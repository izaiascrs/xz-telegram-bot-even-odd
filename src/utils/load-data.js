"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.convertTicksToCartesianDigits = exports.convertTicksToDigits = void 0;
exports.loadHistoricalData = loadHistoricalData;
exports.getTickPipSize = getTickPipSize;
const ws_1 = __importDefault(require("../ws"));
const convertTicksToDigits = (ticks, pipSize) => {
    return ticks.map((tick) => +(tick.price.toFixed(pipSize).slice(-1)));
};
exports.convertTicksToDigits = convertTicksToDigits;
const loadTicksData = (_a) => __awaiter(void 0, [_a], void 0, function* ({ symbol = "R_100", endTime = "latest", count = 5000 }) {
    var _b, _c, _d, _e, _f;
    const response = yield ws_1.default.augmentedSend("ticks_history", {
        "ticks_history": symbol,
        "start": 1,
        "end": endTime,
        "count": count,
    });
    const prices = (_c = (_b = response.history) === null || _b === void 0 ? void 0 : _b.prices) !== null && _c !== void 0 ? _c : [];
    const times = (_e = (_d = response.history) === null || _d === void 0 ? void 0 : _d.times) !== null && _e !== void 0 ? _e : [];
    const pipSize = (_f = response.pip_size) !== null && _f !== void 0 ? _f : 2;
    return {
        ticks: prices.map((price, i) => ({
            price,
            time: times[i]
        })),
        pipSize
    };
});
function loadHistoricalData(_a) {
    return __awaiter(this, arguments, void 0, function* ({ symbol = "R_100", count = 50000, endTime = "latest", format = "ticks" }) {
        var _b;
        const data = {
            ticks: [],
            pipSize: 2
        };
        while (data.ticks.length < count) {
            const { ticks, pipSize } = yield loadTicksData({ symbol, endTime, count: count - data.ticks.length });
            data.ticks.unshift(...ticks);
            data.pipSize = pipSize;
            const first = (_b = ticks.at(0)) === null || _b === void 0 ? void 0 : _b.time;
            if (!first)
                break;
            endTime = Math.floor(new Date(first).getTime() / 1000).toString();
        }
        return (format === "digits"
            ? (0, exports.convertTicksToDigits)(data.ticks, data.pipSize)
            : data);
    });
}
function getTickPipSize(historicalData) {
    const decimal = historicalData.slice(0, 10).reduce((acc, curr) => {
        var _a;
        const decimal = (_a = curr.toString().split(".")[1]) !== null && _a !== void 0 ? _a : "";
        acc = decimal.length > acc ? decimal.length : acc;
        return acc;
    }, 0);
    return decimal;
}
const convertTicksToCartesianDigits = (ticks, pipSize) => {
    var _a;
    if (ticks.length < 1)
        return [];
    const firstTick = ticks[0];
    const digitsArray = [+(firstTick.price.toFixed(pipSize).slice(-1))];
    for (let i = 1; i < ticks.length; i++) {
        // Obtém os ticks atual e anteriores
        const currentTick = ticks[i];
        const previousTick = ticks[i - 1];
        const secondPreviousTick = ticks[i - 2];
        // Calcula os dígitos
        const currentDigit = +currentTick.price.toFixed(pipSize).slice(-1);
        const previousDigit = +previousTick.price.toFixed(pipSize).slice(-1);
        // Determina o sinal do dígito anterior com base na direção do preço
        const isDescendingBefore = ((_a = secondPreviousTick === null || secondPreviousTick === void 0 ? void 0 : secondPreviousTick.price) !== null && _a !== void 0 ? _a : 0) > previousTick.price;
        const formattedPreviousDigit = isDescendingBefore ? -previousDigit : previousDigit;
        // Verifica a direção atual do preço
        const isAscending = currentTick.price > previousTick.price;
        const isDescending = currentTick.price < previousTick.price;
        // Calcula o dígito cartesiano
        let cartesianDigit = 0;
        if (isAscending) {
            if (currentDigit === 0) {
                cartesianDigit = formattedPreviousDigit > 5 ? 10 : 0;
            }
            else {
                cartesianDigit = currentDigit;
            }
        }
        else if (isDescending) {
            if (currentDigit === 0) {
                cartesianDigit = formattedPreviousDigit < -5 ? -10 : 0;
            }
            else {
                cartesianDigit = -currentDigit;
            }
        }
        digitsArray.push(cartesianDigit);
    }
    return digitsArray;
};
exports.convertTicksToCartesianDigits = convertTicksToCartesianDigits;
