import { colorize, FG_CYAN, FG_GREEN, FG_YELLOW, FG_MAGENTA, DIM } from './colors';

/**
 * Pretty print an unknown value with colors
 * Handles objects, arrays, primitives, and errors
 */
export function prettyPrint(value: unknown, indent: number = 2): string {
    if (value === null) {
        return colorize('null', FG_MAGENTA);
    }

    if (value === undefined) {
        return colorize('undefined', DIM);
    }

    if (typeof value === 'string') {
        return colorize(`"${value}"`, FG_GREEN);
    }

    if (typeof value === 'number') {
        return colorize(String(value), FG_YELLOW);
    }

    if (typeof value === 'boolean') {
        return colorize(String(value), FG_MAGENTA);
    }

    if (value instanceof Error) {
        return formatError(value);
    }

    if (Array.isArray(value)) {
        return formatArray(value, indent);
    }

    if (typeof value === 'object') {
        return formatObject(value as Record<string, unknown>, indent);
    }

    // Fallback for other types
    return String(value);
}

/**
 * Format an error with stack trace
 */
function formatError(error: Error): string {
    const lines: string[] = [];
    lines.push(colorize(`${error.name}: ${error.message}`, FG_YELLOW));

    if (error.stack) {
        const stackLines = error.stack.split('\n').slice(1);
        for (const line of stackLines) {
            lines.push(colorize(line, DIM));
        }
    }

    return lines.join('\n');
}

/**
 * Format an array with indentation
 */
function formatArray(arr: unknown[], indent: number): string {
    if (arr.length === 0) {
        return '[]';
    }

    const spaces = ' '.repeat(indent);
    const items = arr.map(item => `${spaces}${prettyPrint(item, indent + 2)}`);

    return `[\n${items.join(',\n')}\n${' '.repeat(indent - 2)}]`;
}

/**
 * Format an object with indentation
 */
function formatObject(obj: Record<string, unknown>, indent: number): string {
    const keys = Object.keys(obj);

    if (keys.length === 0) {
        return '{}';
    }

    const spaces = ' '.repeat(indent);
    const items = keys.map(key => {
        const coloredKey = colorize(key, FG_CYAN);
        const value = prettyPrint(obj[key], indent + 2);
        return `${spaces}${coloredKey}: ${value}`;
    });

    return `{\n${items.join(',\n')}\n${' '.repeat(indent - 2)}}`;
}
