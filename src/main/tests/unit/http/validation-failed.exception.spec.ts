import { HttpStatus } from '@nestjs/common';
import { plainToInstance, Type } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsString,
  Min,
  ValidateNested,
  validateSync,
} from 'class-validator';
import { describe, expect, it } from 'vitest';
import { HttpErrorMessages } from '@/main/http/http-error-messages.const.js';
import { ValidationMessages } from '@/shared/interface-adapters/constants/validation-message.js';
import { toValidationFailedException } from '@/main/http/validation-failed.exception.js';

class ValidateTestItem {
  @IsInt({ message: ValidationMessages.IS_INT('quantidade') })
  @Min(0, { message: ValidationMessages.MIN(0, 'quantidade') })
  quantity: number;
}

class ValidateTestBody {
  @IsString({ message: ValidationMessages.IS_STRING('nome') })
  @IsNotEmpty({ message: ValidationMessages.IS_NOT_EMPTY('nome') })
  name: string;

  @ValidateNested({ each: true })
  @Type(() => ValidateTestItem)
  items: ValidateTestItem[];
}

const VALID_BODY = { name: 'Anel', items: [{ quantity: 1 }] };

function validate(body: object): ReturnType<typeof validateSync> {
  const validateTestBody = plainToInstance(ValidateTestBody, body);

  return validateSync(validateTestBody, {
    whitelist: true,
    forbidNonWhitelisted: true,
  });
}

describe('toValidationFailedException', () => {
  it('should build a 400 exception with the generic validation message', () => {
    const errors = validate({ ...VALID_BODY, name: '' });

    const sut = toValidationFailedException(errors);

    expect(sut.getStatus()).toBe(HttpStatus.BAD_REQUEST);
    expect(sut.message).toBe(HttpErrorMessages.VALIDATION_FAILED);
  });

  it('should keep the field apart from the message', () => {
    const errors = validate({ ...VALID_BODY, name: '' });

    const sut = toValidationFailedException(errors);

    expect(sut.details).toEqual([
      { field: 'name', message: ValidationMessages.IS_NOT_EMPTY('nome') },
    ]);
  });

  it('should point to the position and the field of a nested value', () => {
    const errors = validate({
      ...VALID_BODY,
      items: [{ quantity: 1 }, { quantity: -1 }],
    });

    const sut = toValidationFailedException(errors);

    expect(sut.details).toEqual([
      {
        field: 'items.1.quantity',
        message: ValidationMessages.MIN(0, 'quantidade'),
      },
    ]);
  });

  it('should give one detail for each rule a field breaks', () => {
    const errors = validate({ ...VALID_BODY, items: [{ quantity: -0.5 }] });

    const sut = toValidationFailedException(errors);

    expect(sut.details).toHaveLength(2);
    expect(sut.details).toEqual(
      expect.arrayContaining([
        {
          field: 'items.0.quantity',
          message: ValidationMessages.IS_INT('quantidade'),
        },
        {
          field: 'items.0.quantity',
          message: ValidationMessages.MIN(0, 'quantidade'),
        },
      ]),
    );
  });

  it('should report a field that is not part of the body in Portuguese', () => {
    const errors = validate({ ...VALID_BODY, unknownField: 1 });

    const sut = toValidationFailedException(errors);

    expect(sut.details).toEqual([
      {
        field: 'unknownField',
        message: ValidationMessages.NOT_ALLOWED('unknownField'),
      },
    ]);
  });
});
