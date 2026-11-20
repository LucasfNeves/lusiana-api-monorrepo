import { BadRequestException, type ValidationError } from '@nestjs/common';
import { HttpErrorMessages } from './http-error-messages.const.js';
import { ValidationMessages } from '@/shared/interface-adapters/constants/validation-message.js';

export type ErrorDetail = {
  field: string;
  message: string;
};

const UNKNOWN_FIELD_CONSTRAINT = 'whitelistValidation';

export class ValidationFailedException extends BadRequestException {
  constructor(readonly details: ErrorDetail[]) {
    super(HttpErrorMessages.VALIDATION_FAILED);
  }
}

function toDetails(
  errors: ValidationError[],
  parentField?: string,
): ErrorDetail[] {
  return errors.flatMap((error) => {
    const field = parentField
      ? `${parentField}.${error.property}`
      : error.property;
    const ownDetails = Object.entries(error.constraints ?? {}).map(
      ([constraint, message]) => ({
        field,
        message:
          constraint === UNKNOWN_FIELD_CONSTRAINT
            ? ValidationMessages.NOT_ALLOWED(error.property)
            : message,
      }),
    );

    return [...ownDetails, ...toDetails(error.children ?? [], field)];
  });
}

export function toValidationFailedException(
  errors: ValidationError[],
): ValidationFailedException {
  const details = toDetails(errors);

  return new ValidationFailedException(details);
}
