// Funções utilitárias para comparações comuns
export const comparators = {
  above: (value: number) => (digit: number) => digit > value,
  below: (value: number) => (digit: number) => digit < value,
  equal: (value: number) => (digit: number) => digit === value,
  notEqual: (value: number) => (digit: number) => digit !== value,
  even: (digit: number) => digit % 2 === 0,
  odd: (digit: number) => digit % 2 === 1,
  multipleOf: (value: number) => (digit: number) => digit % value === 0,
  between: (min: number, max: number) => (digit: number) => {
    const minValue = Math.min(min, max);
    const maxValue = Math.max(min, max);
    return digit < minValue || digit > maxValue;
  },
  call: (entryTick: number) => (currentTick: number) => currentTick > entryTick,
  put: (entryTick: number) => (currentTick: number) => currentTick < entryTick,
};