export const ERROR_FIELDS = Symbol('ERROR_FIELDS');

// Código do erro de domínio → campos candidatos do corpo ou da query, em ordem de preferência.
export type ErrorFields = Readonly<Record<string, readonly string[]>>;

// Cada módulo exporta o próprio mapa (interface-adapters/), declarado com
// `satisfies Record<string, readonly string[]>`, e ele entra aqui.
export const FIELDS_BY_ERROR_CODE: ErrorFields = {};
