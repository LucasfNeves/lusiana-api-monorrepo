import { describe, expect, it } from 'vitest';
import { ValidationMessages } from '@/shared/interface-adapters/constants/validation-message.js';

describe('ValidationMessages', () => {
  it.each([
    {
      message: ValidationMessages.IS_NOT_EMPTY('nome'),
      expected: 'nome é obrigatório',
    },
    {
      message: ValidationMessages.IS_STRING('nome'),
      expected: 'nome deve ser um texto',
    },
    {
      message: ValidationMessages.IS_DATE('nascimento'),
      expected: 'nascimento deve ser uma data válida',
    },
    {
      message: ValidationMessages.IS_INT('quantidade'),
      expected: 'quantidade deve ser um número inteiro',
    },
    {
      message: ValidationMessages.IS_IN(['a', 'b'], 'tipo'),
      expected: 'tipo deve ser um destes valores: a, b',
    },
    {
      message: ValidationMessages.MIN(0, 'quantidade'),
      expected: 'quantidade deve ser maior ou igual a 0',
    },
    {
      message: ValidationMessages.MAX(10, 'quantidade'),
      expected: 'quantidade deve ser menor ou igual a 10',
    },
    {
      message: ValidationMessages.MAX_LENGTH(120, 'nome'),
      expected: 'nome deve ter no máximo 120 caracteres',
    },
    {
      message: ValidationMessages.IS_DECIMAL('preço'),
      expected: 'preço deve ser um número decimal',
    },
    {
      message: ValidationMessages.IS_NUMBER('preço'),
      expected: 'preço deve ser um número',
    },
    {
      message: ValidationMessages.IS_UUID('id'),
      expected: 'id deve ser um UUID válido',
    },
    {
      message: ValidationMessages.IS_MATCH(/^\d+$/, 'cpf'),
      expected: 'cpf deve corresponder ao padrão /^\\d+$/',
    },
    {
      message: ValidationMessages.IS_ARRAY('ids'),
      expected: 'ids deve ser um array',
    },
    {
      message: ValidationMessages.IS_BOOLEAN('ativo'),
      expected: 'ativo deve ser um valor booleano',
    },
    {
      message: ValidationMessages.NOT_ALLOWED('extra'),
      expected: 'extra não é um campo permitido',
    },
    {
      message: ValidationMessages.UNIQUE('ids'),
      expected: 'ids deve ser único',
    },
    {
      message: ValidationMessages.NOT_EMPTY('ids'),
      expected: 'ids não pode ser vazio',
    },
  ])(
    'should write "$expected" with the field name',
    ({ message, expected }) => {
      expect(message).toBe(expected);
    },
  );

  it.each([
    {
      message: ValidationMessages.IS_NOT_EMPTY(),
      expected: '$property é obrigatório',
    },
    {
      message: ValidationMessages.IS_STRING(),
      expected: '$property deve ser um texto',
    },
    {
      message: ValidationMessages.IS_DATE(),
      expected: '$property deve ser uma data válida',
    },
    {
      message: ValidationMessages.IS_INT(),
      expected: '$property deve ser um número inteiro',
    },
    {
      message: ValidationMessages.IS_IN(['a']),
      expected: '$property deve ser um destes valores: a',
    },
    {
      message: ValidationMessages.MIN(1),
      expected: '$property deve ser maior ou igual a 1',
    },
    {
      message: ValidationMessages.MAX(1),
      expected: '$property deve ser menor ou igual a 1',
    },
    {
      message: ValidationMessages.MAX_LENGTH(1),
      expected: '$property deve ter no máximo 1 caracteres',
    },
    {
      message: ValidationMessages.IS_DECIMAL(),
      expected: '$property deve ser um número decimal',
    },
    {
      message: ValidationMessages.IS_NUMBER(),
      expected: '$property deve ser um número',
    },
    {
      message: ValidationMessages.IS_UUID(),
      expected: '$property deve ser um UUID válido',
    },
    {
      message: ValidationMessages.IS_MATCH(/x/),
      expected: '$property deve corresponder ao padrão /x/',
    },
    {
      message: ValidationMessages.IS_ARRAY(),
      expected: '$property deve ser um array',
    },
    {
      message: ValidationMessages.IS_BOOLEAN(),
      expected: '$property deve ser um valor booleano',
    },
    {
      message: ValidationMessages.NOT_ALLOWED(),
      expected: '$property não é um campo permitido',
    },
    {
      message: ValidationMessages.UNIQUE(),
      expected: '$property deve ser único',
    },
    {
      message: ValidationMessages.NOT_EMPTY(),
      expected: '$property não pode ser vazio',
    },
  ])(
    'should leave the $property placeholder for class-validator when no field name is given: "$expected"',
    ({ message, expected }) => {
      expect(message).toBe(expected);
    },
  );
});
