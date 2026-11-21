import { describe, expect, it } from 'vitest';
import {
  toResetPasswordEmail,
  toVerificationEmail,
} from '../../../../interface-adapters/presenters/auth-email.presenter.js';

const RECIPIENT = {
  to: 'cliente@exemplo.com',
  name: 'Maria',
  url: 'http://localhost:3000/api/auth/verify-email?token=abc&callbackURL=%2F',
};
const ESCAPED_URL =
  'http://localhost:3000/api/auth/verify-email?token=abc&amp;callbackURL=%2F';
const LOGO_URL =
  'https://assets.sistemawbuy.com.br/arquivos/d767aa28c4971e4b79d72a19c9557b81/config/lusiana-simbolo-dourado-350-6aece9f225a4e1.png';

describe('auth email presenter', () => {
  it.each([
    {
      email: 'verification',
      toEmail: toVerificationEmail,
      subject: 'Confirme seu e-mail na Lusiana',
    },
    {
      email: 'reset password',
      toEmail: toResetPasswordEmail,
      subject: 'Redefina sua senha da Lusiana',
    },
  ])(
    'should address the $email email to the recipient with its subject',
    ({ toEmail, subject }) => {
      const message = toEmail(RECIPIENT);

      expect(message.to).toBe('cliente@exemplo.com');
      expect(message.subject).toBe(subject);
    },
  );

  it.each([
    {
      email: 'verification',
      toEmail: toVerificationEmail,
      buttonLabel: 'CONFIRMAR E-MAIL',
      ignoreNotice:
        'Se você não criou uma conta na Lusiana, ignore este e-mail.',
    },
    {
      email: 'reset password',
      toEmail: toResetPasswordEmail,
      buttonLabel: 'REDEFINIR SENHA',
      ignoreNotice:
        'Se você não pediu para redefinir a senha, ignore este e-mail: sua senha atual continua valendo.',
    },
  ])(
    'should put the greeting, the link button, the logo and the notice in the $email html',
    ({ toEmail, buttonLabel, ignoreNotice }) => {
      const message = toEmail(RECIPIENT);

      expect(message.html).toContain('Olá, Maria.');
      expect(message.html).toContain(
        `<a href="${ESCAPED_URL}" style="display:inline-block;`,
      );
      expect(message.html).toContain(`>${buttonLabel}</a>`);
      expect(message.html).toContain(`<img src="${LOGO_URL}"`);
      expect(message.html).toContain(ignoreNotice);
      expect(message.html).toContain('O link vale por 1 hora.');
    },
  );

  it.each([
    { email: 'verification', toEmail: toVerificationEmail },
    { email: 'reset password', toEmail: toResetPasswordEmail },
  ])(
    'should carry the greeting, the raw link and the validity in the $email text version',
    ({ toEmail }) => {
      const message = toEmail(RECIPIENT);

      expect(message.text).toContain('Olá, Maria.');
      expect(message.text).toContain(`\n${RECIPIENT.url}\n`);
      expect(message.text).toContain('O link vale por 1 hora.');
      expect(message.text).not.toContain('<');
    },
  );

  it('should escape markup in the name so it cannot inject html', () => {
    const recipient = {
      ...RECIPIENT,
      name: '<script>alert("x")</script> & Cia',
    };

    const message = toVerificationEmail(recipient);

    expect(message.html).not.toContain('<script>');
    expect(message.html).toContain(
      'Olá, &lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt; &amp; Cia.',
    );
    expect(message.text).toContain('Olá, <script>alert("x")</script> & Cia.');
  });

  it('should escape a quote in the link so it cannot break out of the href', () => {
    const recipient = {
      ...RECIPIENT,
      url: 'http://localhost:3000/x" onclick="alert(1)',
    };

    const message = toResetPasswordEmail(recipient);

    expect(message.html).not.toContain('" onclick="');
    expect(message.html).toContain(
      'href="http://localhost:3000/x&quot; onclick=&quot;alert(1)"',
    );
  });
});
