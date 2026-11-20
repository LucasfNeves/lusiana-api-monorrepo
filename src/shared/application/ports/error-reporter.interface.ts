export const ERROR_REPORTER = Symbol('ERROR_REPORTER');

export interface ErrorReporter {
  report: (error: unknown) => void;
}
