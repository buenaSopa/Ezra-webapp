import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Helper function to parse review dates into a standard format
export function parseReviewDate(dateStr: string, source: string): Date | null {
  if (!dateStr) return null;
  
  try {
    if (source === 'trustpilot') {
      // Example format: "Friday, March 22, 2024 at 01:22:45 PM"
      // Extract just the date portion without time
      const dateMatch = dateStr.match(/([A-Za-z]+), ([A-Za-z]+ \d+, \d+)/);
      if (dateMatch && dateMatch[2]) {
        // Parse just "March 22, 2024" portion
        return new Date(dateMatch[2]);
      }
      // Try parsing the full string if the regex match fails
      return new Date(dateStr);
    } 
    else if (source === 'amazon') {
      // Example format: "April 29, 2024" or "March 19, 2025"
      return new Date(dateStr);
    }
    
    // Default fallback - try to parse whatever format is provided
    return new Date(dateStr);
  } catch (error) {
    console.error(`Error parsing date (${source}): ${dateStr}`, error);
    return null;
  }
} 