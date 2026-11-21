import { SESv2Client, SendEmailCommand } from '@aws-sdk/client-sesv2';
import { ConfigService } from '@nestjs/config';
import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
  type MockInstance,
} from 'vitest';
import { SesEmailSenderAdapter } from '../../../../interface-adapters/gateways/ses-email-sender.adapter.js';

const EMAIL_CONFIG = {
  email: { region: 'sa-east-1', from: 'contato@lusiana.com.br' },
};
const MESSAGE = {
  to: 'cliente@exemplo.com',
  subject: 'Confirme seu e-mail',
  text: 'Abra o link para confirmar.',
  html: '<p>Abra o link para confirmar.</p>',
};

let sut: SesEmailSenderAdapter;
let sendSpy: MockInstance;

beforeEach(() => {
  sendSpy = vi
    .spyOn(SESv2Client.prototype, 'send')
    .mockResolvedValue({} as never);
  sut = new SesEmailSenderAdapter(new ConfigService(EMAIL_CONFIG));
});

describe('SesEmailSenderAdapter', () => {
  it('should send one SendEmailCommand from the configured address with the text and html bodies', async () => {
    await sut.send(MESSAGE);

    expect(sendSpy).toHaveBeenCalledOnce();
    const command = sendSpy.mock.calls[0]?.[0] as SendEmailCommand;
    expect(command).toBeInstanceOf(SendEmailCommand);
    expect(command.input).toEqual({
      FromEmailAddress: 'contato@lusiana.com.br',
      Destination: { ToAddresses: ['cliente@exemplo.com'] },
      Content: {
        Simple: {
          Subject: { Data: 'Confirme seu e-mail', Charset: 'UTF-8' },
          Body: {
            Text: { Data: 'Abra o link para confirmar.', Charset: 'UTF-8' },
            Html: {
              Data: '<p>Abra o link para confirmar.</p>',
              Charset: 'UTF-8',
            },
          },
        },
      },
    });
  });

  it('should send through a client in the configured region', async () => {
    await sut.send(MESSAGE);

    const client = sendSpy.mock.contexts[0] as SESv2Client;
    expect(await client.config.region()).toBe('sa-east-1');
  });

  it('should propagate an SES failure untranslated', async () => {
    const sesError = new Error(
      'MessageRejected: Email address is not verified.',
    );
    sendSpy.mockRejectedValue(sesError);

    await expect(sut.send(MESSAGE)).rejects.toBe(sesError);
  });
});
