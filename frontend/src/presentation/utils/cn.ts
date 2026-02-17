import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Tailwind class merge utility.
 * - clsx: conditional class composition
 * - twMerge: resolves Tailwind class conflicts (later class wins)
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
