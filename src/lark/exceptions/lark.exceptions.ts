import {
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';

export class LarkClientNotConfiguredException extends InternalServerErrorException {
  constructor(message = 'Lark client is not properly configured') {
    super(message);
  }
}

export class LarkApiException extends BadRequestException {
  constructor(message: string, code?: number) {
    super(`Lark API Error: ${message}${code ? ` (Code: ${code})` : ''}`);
  }
}
