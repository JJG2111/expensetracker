export const users = {
  SJG: { name: "Sweety Jignesh Gandhi", shortName: "Sweety-Gandhi", pan: "ALWPG1054H" },
  JVG: { name: "Jignesh Vinodchandra Gandhi", shortName: "Jignesh-Gandhi", pan: "AIOPG7856J" },
  JJG: { name: "Jenil Jignesh Gandhi", shortName: "Jenil-Gandhi", pan: "DMVPG8914B" },
  PJG: { name: "Parishi Jignesh Gandhi", shortName: "Parishi-Gandhi", pan: "EFRPG2175C" }
} as const;

export const companies = {
  ACC: { name: "Aditya Color Chem", shortName: "ACC" },
  ADC: { name: "Aaditya Dye Chem PVT LTD.", shortName: "Aaditya" }
} as const;

export const months = [
  ["01", "January"],
  ["02", "February"],
  ["03", "March"],
  ["04", "April"],
  ["05", "May"],
  ["06", "June"],
  ["07", "July"],
  ["08", "August"],
  ["09", "September"],
  ["10", "October"],
  ["11", "November"],
  ["12", "December"]
] as const;

export type UserCode = keyof typeof users;
export type CompanyCode = keyof typeof companies;

export function money(value: number) {
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(value);
}

export function displayDate(value: string) {
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}

export function periodFromDate(value: string) {
  const [year, month] = value.split("-");
  return { month, year, monthName: months.find(([code]) => code === month)?.[1] ?? month };
}
