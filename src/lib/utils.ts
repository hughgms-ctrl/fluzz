import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Parses a date string (YYYY-MM-DD) into a Date object without timezone issues.
 * Use this whenever you need to create a Date object from a date-only string.
 */
export function parseDateOnly(dateString: string | null | undefined): Date | null {
  if (!dateString) return null;
  
  // Add time to prevent timezone shift
  return new Date(dateString + "T12:00:00");
}

/**
 * Formata uma data string (YYYY-MM-DD) para o formato brasileiro sem problemas de timezone.
 * Evita o bug onde datas são exibidas um dia antes devido à conversão UTC.
 */
export function formatDateBR(dateString: string | null | undefined): string {
  if (!dateString) return "";
  
  // Parse the date string directly to avoid timezone issues
  const parts = dateString.split("-");
  if (parts.length !== 3) {
    // Fallback for other formats
    const date = new Date(dateString + "T12:00:00");
    return date.toLocaleDateString("pt-BR");
  }
  
  const [year, month, day] = parts;
  return `${day.padStart(2, "0")}/${month.padStart(2, "0")}/${year}`;
}

/**
 * Formata uma data string para exibição curta (DD/MM) sem problemas de timezone.
 */
export function formatDateShort(dateString: string | null | undefined): string {
  if (!dateString) return "";
  
  const parts = dateString.split("-");
  if (parts.length !== 3) {
    const date = new Date(dateString + "T12:00:00");
    return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
  }
  
  const [, month, day] = parts;
  return `${day.padStart(2, "0")}/${month.padStart(2, "0")}`;
}

/**
 * Formata uma data string para exibição com opções.
 */
export function formatDateWithOptions(
  dateString: string | null | undefined,
  options?: Intl.DateTimeFormatOptions
): string {
  if (!dateString) return "";
  
  // Add time to prevent timezone shift
  const date = new Date(dateString + "T12:00:00");
  return date.toLocaleDateString("pt-BR", options);
}

/**
 * Formata o nome de um usuário para exibição resumida.
 * Ex: "Hugo Gomes da Silva" -> "Hugo G."
 * Ex: "Lucas Alves" -> "Lucas A."
 */
export function formatUserName(fullName: string | null | undefined): string {
  if (!fullName) return "";
  
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 0) return "";
  
  const firstName = parts[0];
  
  // Find the last significant name part (ignoring prepositions like "da", "de", "dos")
  const prepositions = ["da", "de", "do", "das", "dos", "e"];
  let lastNameInitial = "";
  
  for (let i = parts.length - 1; i >= 1; i--) {
    if (!prepositions.includes(parts[i].toLowerCase())) {
      lastNameInitial = parts[i].charAt(0).toUpperCase() + ".";
      break;
    }
  }
  
  return lastNameInitial ? `${firstName} ${lastNameInitial}` : firstName;
}
