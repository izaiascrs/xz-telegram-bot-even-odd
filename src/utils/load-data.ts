import apiManager from "../ws";

export const convertTicksToDigits = (ticks: { price: number, time: number }[], pipSize: number) => {
  return ticks.map((tick) => +(tick.price.toFixed(pipSize).slice(-1)));
}

const loadTicksData = async ({
  symbol = "R_100",
  endTime = "latest",
  count = 5000
}: {
  symbol: string;
  endTime?: string;
  count: number;
}) => {
  const response = await apiManager.augmentedSend("ticks_history", {
    "ticks_history": symbol,    
    "start": 1,
    "end": endTime,
    "count":  count as unknown as undefined,
  });


  const prices = response.history?.prices ?? [];
  const times = response.history?.times ?? [];
  const pipSize = response.pip_size ?? 2 as number;
  return {
    ticks: prices.map((price, i) => ({
      price,
      time: times[i] 
    })),
    pipSize
  }

}

export async function loadHistoricalData<T extends "ticks" | "digits">({
  symbol = "R_100",
  count = 50_000,
  endTime = "latest",
  format = "ticks" as T
}: {
  symbol: string;
  count: number;
  endTime?: string;
  format?: T;
}): Promise<T extends "digits" ? number[] : {
  ticks: { price: number; time: number; }[];
  pipSize: number;
}> {
  const data = {
    ticks: [] as { price: number, time: number }[],
    pipSize: 2
  }
  
  while(data.ticks.length < count) {
    const { ticks, pipSize } = await loadTicksData({ symbol, endTime, count: count - data.ticks.length });
    data.ticks.unshift(...ticks);
    data.pipSize = pipSize;
    const first = ticks.at(0)?.time;
    if(!first) break;
    endTime = Math.floor(new Date(first).getTime() / 1000).toString();
  }

  return (format === "digits" 
    ? convertTicksToDigits(data.ticks, data.pipSize)
    : data
  ) as T extends "digits" ? number[] : {
    ticks: { price: number; time: number; }[];
    pipSize: number;
  };
}

export type TTickData = {
  price: number;
  time: number;
}

export type TLoadHistoricalDataResult<T extends "ticks" | "digits"> = T extends "ticks" ? {
  ticks: TTickData[];
  pipSize: number;
} : T extends "digits" ? number[] : never;


export function getTickPipSize(historicalData: number[]) {
  const decimal = historicalData.slice(0, 10).reduce((acc, curr) => {
    const decimal = curr.toString().split(".")[1] ?? "";
    acc = decimal.length > acc ? decimal.length : acc;
    return acc;
  }, 0);
  return decimal;
}

export const convertTicksToCartesianDigits = (ticks: TTickData[], pipSize: number) => {
  if (ticks.length < 1) return [];
  
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
    const isDescendingBefore = (secondPreviousTick?.price ?? 0) > previousTick.price;
    const formattedPreviousDigit = isDescendingBefore ? -previousDigit : previousDigit;
    
    // Verifica a direção atual do preço
    const isAscending = currentTick.price > previousTick.price;
    const isDescending = currentTick.price < previousTick.price;
    
    // Calcula o dígito cartesiano
    let cartesianDigit = 0;
    
    if (isAscending) {
      if (currentDigit === 0) {
        cartesianDigit = formattedPreviousDigit > 5 ? 10 : 0;
      } else {
        cartesianDigit = currentDigit;
      }
    } else if (isDescending) {
      if (currentDigit === 0) {
        cartesianDigit = formattedPreviousDigit < -5 ? -10 : 0;
      } else {
        cartesianDigit = -currentDigit;
      }
    }
    
    digitsArray.push(cartesianDigit);
  }
  
  return digitsArray;
}