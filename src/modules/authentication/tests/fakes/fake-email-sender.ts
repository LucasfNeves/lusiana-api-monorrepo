import type {
  EmailMessage,
  EmailSender,
} from '../../application/ports/email-sender.interface.js';

export class FakeEmailSender implements EmailSender {
  private readonly sentMessages: EmailMessage[] = [];

  send(message: EmailMessage): Promise<void> {
    this.sentMessages.push({ ...message });

    return Promise.resolve();
  }

  getSentMessages(): EmailMessage[] {
    return this.sentMessages.map((message) => ({ ...message }));
  }
}
