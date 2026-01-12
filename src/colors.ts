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
 * Detect if the terminal supports colors
 * Checks environment variables and TTY status
 * 
 * @returns true if colors are supported
 */
export function supportsColor(): boolean {
    // Respect NO_COLOR environment variable (https://no-color.org/)
    if ('NO_COLOR' in process.env) {
        return false;
    }

    // Respect FORCE_COLOR environment variable
    if ('FORCE_COLOR' in process.env) {
        return process.env.FORCE_COLOR !== '0';
    }

    // Check if stdout is a TTY
    if (!process.stdout.isTTY) {
        return false;
    }

    // Check TERM environment variable
    const term = process.env.TERM || '';
    if (term === 'dumb') {
        return false;
    }

    // CI environments
    if (process.env.CI && !process.env.FORCE_COLOR) {
        return false;
    }

    return true;
}

/**
 * Helper function to wrap text in color codes
 * Only applies colors if terminal supports them
 * 
 * @param text - Text to colorize
 * @param codes - ANSI color codes to apply
 * @param forceColors - Override color detection
 * @returns Colorized text or plain text
 */
export function colorize(text: string, codes: string[], forceColors?: boolean): string {
    const shouldUseColors = forceColors ?? supportsColor();

    if (!shouldUseColors) {
        return text;
    }

    return `${codes.join('')}${text}${RESET}`;
}
