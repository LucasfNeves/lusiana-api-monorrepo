import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  SESv2Client,
  SendEmailCommand,
  type SendEmailCommandInput,
} from '@aws-sdk/client-sesv2';
import type {
  EmailMessage,
  EmailSender,
} from '../../application/ports/email-sender.interface.js';

@Injectable()
export class SesEmailSenderAdapter implements EmailSender {
  private readonly sesClient: SESv2Client;
  private readonly emailFrom: string;

  constructor(configService: ConfigService) {
    this.sesClient = new SESv2Client({
      region: configService.getOrThrow<string>('email.region'),
    });
    this.emailFrom = configService.getOrThrow<string>('email.from');
  }

  async send(message: EmailMessage): Promise<void> {
    const command = new SendEmailCommand(this.toSendEmailInput(message));

    await this.sesClient.send(command);
  }

  private toSendEmailInput(message: EmailMessage): SendEmailCommandInput {
    return {
      FromEmailAddress: this.emailFrom,
      Destination: {
        ToAddresses: [message.to],
      },
      Content: {
        Simple: {
          Subject: {
            Data: message.subject,
            Charset: 'UTF-8',
          },
          Body: {
            Text: {
              Data: message.text,
              Charset: 'UTF-8',
            },
            Html: {
              Data: message.html,
              Charset: 'UTF-8',
            },
          },
        },
      },
    };
  }
}
