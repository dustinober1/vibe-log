/**
 * ANSI escape codes for terminal colors
 * These work in most modern terminals
 */

// Reset all styles
export const RESET = '\x1b[0m';

// Text styles
export const BOLD = '\x1b[1m';
export const DIM = '\x1b[2m';

// Foreground colors
export const FG_BLACK = '\x1b[30m';
export const FG_RED = '\x1b[31m';
export const FG_GREEN = '\x1b[32m';
export const FG_YELLOW = '\x1b[33m';
export const FG_BLUE = '\x1b[34m';
export const FG_MAGENTA = '\x1b[35m';
export const FG_CYAN = '\x1b[36m';
export const FG_WHITE = '\x1b[37m';

// Bright foreground colors
export const FG_BRIGHT_BLACK = '\x1b[90m';
export const FG_BRIGHT_RED = '\x1b[91m';
export const FG_BRIGHT_GREEN = '\x1b[92m';
export const FG_BRIGHT_YELLOW = '\x1b[93m';
export const FG_BRIGHT_BLUE = '\x1b[94m';
export const FG_BRIGHT_MAGENTA = '\x1b[95m';
export const FG_BRIGHT_CYAN = '\x1b[96m';
export const FG_BRIGHT_WHITE = '\x1b[97m';

/**
 * Helper function to wrap text in color codes
 */
export function colorize(text: string, ...codes: string[]): string {
    return `${codes.join('')}${text}${RESET}`;
}
