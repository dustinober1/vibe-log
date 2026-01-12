import { colorize, FG_CYAN, FG_GREEN, FG_YELLOW, FG_MAGENTA, FG_RED, DIM } from './colors';
import { getConfig } from './config';

/**
 * Pretty print an unknown value with colors
 * Handles objects, arrays, primitives, errors, and circular references
 * 
 * @param value - The value to print
 * @param indent - Current indentation level
 * @param seen - WeakSet to track circular references
 * @param depth - Current depth in the object tree
 * @returns Formatted string representation
 */
export function prettyPrint(
    value: unknown,
    indent: number = 2,
    seen: WeakSet<object> = new WeakSet(),
    depth: number = 0
): string {
    const config = getConfig();
    const useColors = config.useColors;

    // Check depth limit to prevent stack overflow
    if (depth > config.maxDepth) {
        return colorize('[Max Depth Reached]', [DIM], useColors);
    }

    if (value === null) {
        return colorize('null', [FG_MAGENTA], useColors);
    }

    if (value === undefined) {
        return colorize('undefined', [DIM], useColors);
    }

    if (typeof value === 'string') {
        return colorize(`"${value}"`, [FG_GREEN], useColors);
    }

    if (typeof value === 'number') {
        return colorize(String(value), [FG_YELLOW], useColors);
    }

    if (typeof value === 'boolean') {
        return colorize(String(value), [FG_MAGENTA], useColors);
    }

    if (typeof value === 'function') {
        return colorize(`[Function: ${value.name || 'anonymous'}]`, [DIM], useColors);
    }

    if (typeof value === 'symbol') {
        return colorize(String(value), [FG_CYAN], useColors);
    }

    if (typeof value === 'bigint') {
        return colorize(`${value}n`, [FG_YELLOW], useColors);
    }

    if (value instanceof Error) {
        return formatError(value, useColors);
    }

    if (value instanceof Date) {
        return colorize(value.toISOString(), [FG_CYAN], useColors);
    }

    if (value instanceof RegExp) {
        return colorize(String(value), [FG_CYAN], useColors);
    }

    if (Array.isArray(value)) {
        return formatArray(value, indent, seen, depth, useColors);
    }

    if (typeof value === 'object') {
        return formatObject(value as Record<string, unknown>, indent, seen, depth, useColors);
    }

    // Fallback for other types
    return String(value);
}

/**
 * Format an error with stack trace
 */
function formatError(error: Error, useColors?: boolean): string {
    const lines: string[] = [];
    lines.push(colorize(`${error.name}: ${error.message}`, [FG_RED], useColors));

    if (error.stack) {
        const stackLines = error.stack.split('\n').slice(1);
        for (const line of stackLines) {
            lines.push(colorize(line, [DIM], useColors));
        }
    }

    return lines.join('\n');
}

/**
 * Format an array with indentation
 */
function formatArray(
    arr: unknown[],
    indent: number,
    seen: WeakSet<object>,
    depth: number,
    useColors?: boolean
): string {
    // Check for circular reference
    if (seen.has(arr)) {
        return colorize('[Circular]', [DIM], useColors);
    }

    if (arr.length === 0) {
        return '[]';
    }

    seen.add(arr);

    const spaces = ' '.repeat(indent);
    const items = arr.map(item => `${spaces}${prettyPrint(item, indent + 2, seen, depth + 1)}`);

    seen.delete(arr);

    return `[\n${items.join(',\n')}\n${' '.repeat(indent - 2)}]`;
}

/**
 * Format an object with indentation
 */
function formatObject(
    obj: Record<string, unknown>,
    indent: number,
    seen: WeakSet<object>,
    depth: number,
    useColors?: boolean
): string {
    // Check for circular reference
    if (seen.has(obj)) {
        return colorize('[Circular]', [DIM], useColors);
    }

    try {
        const keys = Object.keys(obj);

        if (keys.length === 0) {
            return '{}';
        }

        seen.add(obj);

        const spaces = ' '.repeat(indent);
        const items = keys.map(key => {
            const coloredKey = colorize(key, [FG_CYAN], useColors);

            try {
                const value = prettyPrint(obj[key], indent + 2, seen, depth + 1);
                return `${spaces}${coloredKey}: ${value}`;
            } catch (error) {
                // Handle getters that throw
                const errorMsg = error instanceof Error ? error.message : 'Unknown error';
                return `${spaces}${coloredKey}: ${colorize(`[Error: ${errorMsg}]`, [FG_RED], useColors)}`;
            }
        });

        seen.delete(obj);

        return `{\n${items.join(',\n')}\n${' '.repeat(indent - 2)}}`;
    } catch (error) {
        // Handle objects that can't be enumerated (e.g., some Proxy objects)
        const errorMsg = error instanceof Error ? error.message : 'Cannot enumerate object';
        return colorize(`[Error: ${errorMsg}]`, [FG_RED], useColors);
    }
}
