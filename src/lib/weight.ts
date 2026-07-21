import type { WeightUnit } from "./db";

const GRAMS_PER_LB = 453.59237;

export function defaultWeightUnit(region: string | null | undefined): Exclude<WeightUnit, "auto"> {
  if (region === "United Kingdom") return "st";
  if (region === "United States") return "lb";
  return "kg";
}

export function resolvedWeightUnit(unit: WeightUnit, region: string | null | undefined): Exclude<WeightUnit, "auto"> {
  return unit === "auto" ? defaultWeightUnit(region) : unit;
}

export function weightUnitLabel(unit: Exclude<WeightUnit, "auto">): string {
  return unit === "st" ? "stone" : unit;
}

export function gramsFromWeight(value: number, unit: Exclude<WeightUnit, "auto">): number {
  if (unit === "kg") return Math.round(value * 1000);
  if (unit === "lb") return Math.round(value * GRAMS_PER_LB);
  return Math.round(value * 14 * GRAMS_PER_LB);
}

export function weightFromGrams(grams: number, unit: Exclude<WeightUnit, "auto">): number {
  if (unit === "kg") return grams / 1000;
  if (unit === "lb") return grams / GRAMS_PER_LB;
  return grams / (14 * GRAMS_PER_LB);
}

export function formatWeight(grams: number, unit: Exclude<WeightUnit, "auto">): string {
  if (unit === "kg") return `${(grams / 1000).toFixed(1)} kg`;
  if (unit === "lb") return `${(grams / GRAMS_PER_LB).toFixed(1)} lb`;

  const totalPounds = grams / GRAMS_PER_LB;
  const stone = Math.floor(totalPounds / 14);
  const pounds = Math.round(totalPounds - stone * 14);
  if (pounds === 14) return `${stone + 1} st 0 lb`;
  return `${stone} st ${pounds} lb`;
}

export function todayKey(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
