import nodemailer from 'nodemailer';

const createTransporter = () => {
  if (
    process.env.SMTP_HOST &&
    process.env.SMTP_PORT &&
    process.env.SMTP_USER &&
    process.env.SMTP_PASS
  ) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      secure: String(process.env.SMTP_SECURE || 'false') === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  return nodemailer.createTransport({
    jsonTransport: true,
  });
};

const transporter = createTransporter();

export const EmailService = {
  async sendMail({ to, subject, text, html }) {
    if (!to) {
      throw new Error('Recipient email is required');
    }

    const from =
      process.env.MAIL_FROM ||
      process.env.SMTP_USER ||
      'no-reply@healthcenter.local';

    return transporter.sendMail({
      from,
      to,
      subject,
      text,
      html,
    });
  },
};
