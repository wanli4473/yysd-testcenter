import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function tierLabel(probability: number): "冲刺" | "匹配" | "保底" {
  if (probability < 40) return "冲刺";
  if (probability < 70) return "匹配";
  return "保底";
}
