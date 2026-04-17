import path from "path";
import { fileURLToPath } from "url";
import pug from "pug";
import nodemailer from "nodemailer";
import { htmlToText } from "html-to-text";
import type Mail from "nodemailer/lib/mailer/index.js";
import type { IUser } from "../models/User.model.js";
import { env } from "../config/env.js";
import { PLATFORM_BRAND_NAME } from "../constants/branding.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const isEmailConfigured = (): boolean =>
  !!(
    env.emailHost &&
    env.emailAddress &&
    env.emailPassword
  );

export const createMailTransport = () => {
  const host = env.emailHost;
  const port = env.emailPort ? Number(env.emailPort) : 587;
  const secure =
    env.emailSecure !== undefined
      ? env.emailSecure === "true"
      : port === 465;
  const requireTLS = env.emailRequireTls === "true";
  const rejectUnauthorized =
    env.emailTlsRejectUnauthorized === undefined
      ? true
      : env.emailTlsRejectUnauthorized === "true";
  const user = env.emailAddress;
  const pass = env.emailPassword;
  if (!host || !user || !pass) {
    throw new Error(
      "Email is not configured. Set EMAIL_HOST, EMAIL_ADDRESS, and EMAIL_PASSWORD.",
    );
  }
  return nodemailer.createTransport({
    host,
    port,
    secure,
    requireTLS,
    tls: {
      rejectUnauthorized,
    },
    auth: { user, pass },
  });
};

export async function verifyMailTransport(): Promise<void> {
  if (!isEmailConfigured()) {
    throw new Error(
      "Email is not configured. Set EMAIL_HOST, EMAIL_ADDRESS, and EMAIL_PASSWORD.",
    );
  }
  const transport = createMailTransport();
  await transport.verify();
}

export async function sendTemplatedMail(params: {
  to: string;
  subject: string;
  template: string;
  locals: Record<string, unknown>;
  attachments?: Mail.Attachment[];
}): Promise<void> {
  if (!isEmailConfigured()) return;

  const html = pug.renderFile(
    path.join(__dirname, "../views/email", `${params.template}.pug`),
    {
      companyName: env.companyName,
      platformBrandName: PLATFORM_BRAND_NAME,
      isPlatformOnly: false,
      subject: params.subject,
      ...params.locals,
    },
  );

  const transport = createMailTransport();
  await transport.sendMail({
    from: `${PLATFORM_BRAND_NAME} <${env.emailFrom ?? env.emailAddress ?? "noreply@localhost"}>`,
    to: params.to,
    subject: params.subject,
    html,
    text: htmlToText(html),
    attachments: params.attachments,
  });
}

class Email {
  to: string;
  firstName: string;
  from: string;
  message: string;

  constructor(
    user: Pick<IUser, "email" | "firstName" | "lastName">,
    message: string,
  ) {
    this.message = message;
    this.to = user.email;
    this.firstName = user.firstName;
    this.from = `${PLATFORM_BRAND_NAME} <${env.emailFrom ?? env.emailAddress ?? "noreply@localhost"}>`;
  }

  async send(
    template: string,
    subject: string,
    locals: Record<string, unknown> = {},
  ) {
    const html = pug.renderFile(
      path.join(__dirname, "../views/email", `${template}.pug`),
      {
        message: this.message,
        firstName: this.firstName,
        subject,
        companyName: env.companyName,
        platformBrandName: PLATFORM_BRAND_NAME,
        isPlatformOnly: false,
        ...locals,
      },
    );

    const mailOptions = {
      from: this.from,
      to: this.to,
      subject,
      html,
      text: htmlToText(html),
    };

    await createMailTransport().sendMail(mailOptions);
  }

  async sendWelcome() {
    await this.send("welcome", `Welcome to ${env.companyName}`, {
      isPlatformOnly: true,
    });
  }

  async sendPasswordReset(resetUrl: string) {
    const company = env.companyName;
    await this.send("passwordReset", `Reset your ${company} password`, {
      resetUrl,
      companyName: company,
      isPlatformOnly: true,
    });
  }
}

export default Email;
