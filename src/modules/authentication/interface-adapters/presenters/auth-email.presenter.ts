import type { EmailMessage } from '../../application/ports/email-sender.interface.js';

const LOGO_URL =
  'https://assets.sistemawbuy.com.br/arquivos/d767aa28c4971e4b79d72a19c9557b81/config/lusiana-simbolo-dourado-350-6aece9f225a4e1.png';
const STORE_URL = 'https://www.lusiana.com.br';
const LINK_VALIDITY = '1 hora';

type AuthEmailRecipient = {
  to: string;
  name: string;
  url: string;
};

type AuthEmailCopy = {
  subject: string;
  preheader: string;
  title: string;
  intro: string;
  buttonLabel: string;
  ignoreNotice: string;
};

export function toVerificationEmail(
  recipient: AuthEmailRecipient,
): EmailMessage {
  return _toAuthEmail(recipient, {
    subject: 'Confirme seu e-mail na Lusiana',
    preheader: 'Falta só um clique para ativar sua conta na Lusiana.',
    title: 'Confirme seu e-mail',
    intro:
      'Que bom ter você com a gente. Para ativar sua conta e entrar na loja, confirme seu e-mail:',
    buttonLabel: 'CONFIRMAR E-MAIL',
    ignoreNotice: 'Se você não criou uma conta na Lusiana, ignore este e-mail.',
  });
}

export function toResetPasswordEmail(
  recipient: AuthEmailRecipient,
): EmailMessage {
  return _toAuthEmail(recipient, {
    subject: 'Redefina sua senha da Lusiana',
    preheader: 'Recebemos um pedido para redefinir a senha da sua conta.',
    title: 'Redefinir senha',
    intro:
      'Recebemos um pedido para redefinir a senha da sua conta. Para criar uma senha nova, use o botão abaixo:',
    buttonLabel: 'REDEFINIR SENHA',
    ignoreNotice:
      'Se você não pediu para redefinir a senha, ignore este e-mail: sua senha atual continua valendo.',
  });
}

function _toAuthEmail(
  recipient: AuthEmailRecipient,
  copy: AuthEmailCopy,
): EmailMessage {
  return {
    to: recipient.to,
    subject: copy.subject,
    text: _toText(recipient, copy),
    html: _toHtml(recipient, copy),
  };
}

function _toText(recipient: AuthEmailRecipient, copy: AuthEmailCopy): string {
  return [
    `Olá, ${recipient.name}.`,
    '',
    copy.intro,
    recipient.url,
    '',
    `O link vale por ${LINK_VALIDITY}. ${copy.ignoreNotice}`,
    '',
    'Lusiana Joias · www.lusiana.com.br',
  ].join('\n');
}

function _toHtml(recipient: AuthEmailRecipient, copy: AuthEmailCopy): string {
  const name = _escapeHtml(recipient.name);
  const url = _escapeHtml(recipient.url);
  const bodyFont = "Nunito, 'Helvetica Neue', Helvetica, Arial, sans-serif";
  const titleFont = "Georgia, 'Times New Roman', serif";

  return `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="color-scheme" content="light" />
    <title>${_escapeHtml(copy.title)}</title>
  </head>
  <body style="margin:0; padding:0; background-color:#faf8f5;">
    <div style="display:none; max-height:0; overflow:hidden; opacity:0;">${_escapeHtml(copy.preheader)}</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#faf8f5;">
      <tr>
        <td align="center" style="padding:32px 16px;">
          <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%; max-width:600px; background-color:#ffffff; border:1px solid #e6e3df;">
            <tr>
              <td align="center" style="background-color:#13213b; padding:36px 24px 28px;">
                <img src="${LOGO_URL}" width="64" height="57" alt="" style="display:block; border:0; width:64px; height:auto;" />
                <div style="margin-top:14px; font-family:${titleFont}; font-size:26px; letter-spacing:8px; color:#c9b590;">LUSIANA</div>
              </td>
            </tr>
            <tr>
              <td style="padding:40px 40px 8px; font-family:${bodyFont}; color:#464c59;">
                <h1 style="margin:0 0 16px; font-family:${titleFont}; font-size:24px; font-weight:normal; color:#13213b;">${_escapeHtml(copy.title)}</h1>
                <p style="margin:0 0 16px; font-size:16px; line-height:24px;">Olá, ${name}.</p>
                <p style="margin:0 0 28px; font-size:16px; line-height:24px;">${_escapeHtml(copy.intro)}</p>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:0 40px 28px;">
                <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td align="center" style="background-color:#13213b; border-radius:4px;">
                      <a href="${url}" style="display:inline-block; padding:14px 36px; font-family:${bodyFont}; font-size:15px; font-weight:bold; letter-spacing:1px; color:#c9b590; text-decoration:none;">${_escapeHtml(copy.buttonLabel)}</a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:0 40px 36px; font-family:${bodyFont}; color:#626877;">
                <p style="margin:0 0 12px; font-size:14px; line-height:21px;">O link vale por ${LINK_VALIDITY}. Se o botão não funcionar, copie e cole este endereço no navegador:</p>
                <p style="margin:0 0 24px; font-size:13px; line-height:20px; word-break:break-all;"><a href="${url}" style="color:#b8892d;">${url}</a></p>
                <p style="margin:0; font-size:14px; line-height:21px;">${_escapeHtml(copy.ignoreNotice)}</p>
              </td>
            </tr>
            <tr>
              <td align="center" style="border-top:1px solid #e6e3df; padding:20px 24px; font-family:${bodyFont}; font-size:12px; line-height:18px; color:#626877;">
                Lusiana Joias · <a href="${STORE_URL}" style="color:#b8892d; text-decoration:none;">www.lusiana.com.br</a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function _escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
