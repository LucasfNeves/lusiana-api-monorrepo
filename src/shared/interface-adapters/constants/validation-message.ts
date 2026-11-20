export const ValidationMessages = {
  IS_NOT_EMPTY: (field?: string) => `${field ?? '$property'} é obrigatório`,
  IS_STRING: (field?: string) => `${field ?? '$property'} deve ser um texto`,
  IS_DATE: (field?: string) =>
    `${field ?? '$property'} deve ser uma data válida`,
  IS_INT: (field?: string) =>
    `${field ?? '$property'} deve ser um número inteiro`,
  IS_IN: (values: readonly string[], field?: string) =>
    `${field ?? '$property'} deve ser um destes valores: ${values.join(', ')}`,
  MIN: (min: number, field?: string) =>
    `${field ?? '$property'} deve ser maior ou igual a ${min}`,
  MAX: (max: number, field?: string) =>
    `${field ?? '$property'} deve ser menor ou igual a ${max}`,
  MAX_LENGTH: (max: number, field?: string) =>
    `${field ?? '$property'} deve ter no máximo ${max} caracteres`,
  IS_DECIMAL: (field?: string) =>
    `${field ?? '$property'} deve ser um número decimal`,
  IS_NUMBER: (field?: string) => `${field ?? '$property'} deve ser um número`,
  IS_UUID: (field?: string) =>
    `${field ?? '$property'} deve ser um UUID válido`,
  IS_MATCH: (pattern: RegExp, field?: string) =>
    `${field ?? '$property'} deve corresponder ao padrão ${pattern}`,
  IS_ARRAY: (field?: string) => `${field ?? '$property'} deve ser um array`,
  IS_BOOLEAN: (field?: string) =>
    `${field ?? '$property'} deve ser um valor booleano`,
  NOT_ALLOWED: (field?: string) =>
    `${field ?? '$property'} não é um campo permitido`,
  UNIQUE: (field?: string) => `${field ?? '$property'} deve ser único`,
  NOT_EMPTY: (field?: string) => `${field ?? '$property'} não pode ser vazio`,
};
