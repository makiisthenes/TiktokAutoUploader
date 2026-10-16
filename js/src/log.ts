/**
 * Logging. Warnings (e.g. a cloud login link to open, a mention that could not be resolved) go to
 * `console.warn` by default; debug and info messages are dropped. Pass your own logger to
 * {@link setLogger} to route them elsewhere, or `null` to silence everything.
 */
export interface Logger {
  debug(message: string): void;
  info(message: string): void;
  warn(message: string): void;
}

const noop = () => {};
const defaultLogger: Logger = {
  debug: noop,
  info: noop,
  warn: (message) => console.warn(`autotok: ${message}`),
};

let current: Logger = defaultLogger;

/** Route autotok's log messages to `logger` (missing methods are ignored); `null` silences them. */
export function setLogger(logger: Partial<Logger> | null): void {
  current = {
    debug: logger?.debug?.bind(logger) ?? noop,
    info: logger?.info?.bind(logger) ?? noop,
    warn: logger?.warn?.bind(logger) ?? noop,
  };
}

export const log: Logger = {
  debug: (message) => current.debug(message),
  info: (message) => current.info(message),
  warn: (message) => current.warn(message),
};
