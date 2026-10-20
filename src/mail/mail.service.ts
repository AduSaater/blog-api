import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter | null = null;

  constructor(private readonly configService: ConfigService) {
    this.initTransporter();
  }

  private initTransporter(): void {
    const user = this.configService.get<string>('MAIL_USER');
    const pass = this.configService.get<string>('MAIL_PASS');
    const host = this.configService.get<string>('MAIL_HOST', 'smtp.gmail.com');
    const port = this.configService.get<number>('MAIL_PORT', 465);
    const secure = this.configService.get<boolean>('MAIL_SECURE', true);

    if (!user || !pass) {
      this.logger.warn(
        'MAIL_USER or MAIL_PASS is not configured in .env. Emails will be logged to console instead of sent via SMTP.',
      );
      return;
    }

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: {
        user,
        pass,
      },
    });

    this.transporter.verify((error) => {
      if (error) {
        this.logger.error('Failed to connect to Gmail SMTP server:', error.message);
      } else {
        this.logger.log('Connected successfully to Gmail SMTP server.');
      }
    });
  }

  /**
   * Send Account Verification OTP Email
   */
  public async sendAccountVerificationOtp(
    email: string,
    firstName: string,
    otp: string,
  ): Promise<void> {
    const from =
      this.configService.get<string>('MAIL_FROM') ||
      '"Blog Platform" <noreply@blogapp.com>';
    const subject = 'Verify Your Blog Account - One Time Password (OTP)';

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f6f8; margin: 0; padding: 24px; color: #333333; }
            .container { max-width: 580px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.06); }
            .header { background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); padding: 32px 24px; text-align: center; color: #ffffff; }
            .header h1 { margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.5px; }
            .content { padding: 32px 28px; line-height: 1.6; }
            .otp-box { margin: 28px 0; padding: 20px; background-color: #f0f4ff; border-radius: 8px; text-align: center; border: 1px dashed #6366f1; }
            .otp-code { font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #4338ca; margin: 0; font-family: 'Courier New', Courier, monospace; }
            .badge { display: inline-block; background-color: #e0e7ff; color: #4338ca; font-size: 12px; font-weight: 600; padding: 4px 10px; border-radius: 9999px; text-transform: uppercase; margin-bottom: 12px; }
            .footer { padding: 20px 28px; background-color: #f9fafb; font-size: 13px; color: #6b7280; text-align: center; border-top: 1px solid #f3f4f6; }
            .note { font-size: 13px; color: #ef4444; margin-top: 16px; font-weight: 500; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Welcome to Blog Platform</h1>
            </div>
            <div class="content">
              <p>Hi <strong>${firstName}</strong>,</p>
              <p>Thank you for creating an account with us. To verify your email address and activate your account, please use the One-Time Password (OTP) below:</p>
              
              <div class="otp-box">
                <span class="badge">Verification Code</span>
                <p class="otp-code">${otp}</p>
                <p style="margin: 8px 0 0; font-size: 13px; color: #6b7280;">Expires in 10 minutes</p>
              </div>

              <p>Enter this code on the verification screen to complete your registration.</p>
              <p class="note">If you did not initiate this request, please safely disregard this email.</p>
            </div>
            <div class="footer">
              <p>&copy; ${new Date().getFullYear()} Blog Platform. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const text = `Hi ${firstName},\n\nYour account verification code is: ${otp}\nThis code will expire in 10 minutes.\n\nIf you did not request this, please ignore this email.`;

    await this.sendMail(email, from, subject, text, html, otp, 'Account Verification');
  }

  /**
   * Send Password Reset OTP Email
   */
  public async sendPasswordResetOtp(
    email: string,
    firstName: string,
    otp: string,
  ): Promise<void> {
    const from =
      this.configService.get<string>('MAIL_FROM') ||
      '"Blog Platform" <noreply@blogapp.com>';
    const subject = 'Password Reset Request - One Time Password (OTP)';

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f6f8; margin: 0; padding: 24px; color: #333333; }
            .container { max-width: 580px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.06); }
            .header { background: linear-gradient(135deg, #dc2626 0%, #ea580c 100%); padding: 32px 24px; text-align: center; color: #ffffff; }
            .header h1 { margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.5px; }
            .content { padding: 32px 28px; line-height: 1.6; }
            .otp-box { margin: 28px 0; padding: 20px; background-color: #fef2f2; border-radius: 8px; text-align: center; border: 1px dashed #ef4444; }
            .otp-code { font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #b91c1c; margin: 0; font-family: 'Courier New', Courier, monospace; }
            .badge { display: inline-block; background-color: #fee2e2; color: #b91c1c; font-size: 12px; font-weight: 600; padding: 4px 10px; border-radius: 9999px; text-transform: uppercase; margin-bottom: 12px; }
            .footer { padding: 20px 28px; background-color: #f9fafb; font-size: 13px; color: #6b7280; text-align: center; border-top: 1px solid #f3f4f6; }
            .note { font-size: 13px; color: #b91c1c; margin-top: 16px; font-weight: 500; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Reset Your Password</h1>
            </div>
            <div class="content">
              <p>Hi <strong>${firstName}</strong>,</p>
              <p>We received a request to reset your password. Use the One-Time Password (OTP) below to authorize this password change:</p>
              
              <div class="otp-box">
                <span class="badge">Password Reset Code</span>
                <p class="otp-code">${otp}</p>
                <p style="margin: 8px 0 0; font-size: 13px; color: #6b7280;">Expires in 10 minutes</p>
              </div>

              <p>Enter this code alongside your new password to complete the reset.</p>
              <p class="note">If you did not request a password reset, please contact support or ignore this email immediately.</p>
            </div>
            <div class="footer">
              <p>&copy; ${new Date().getFullYear()} Blog Platform. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const text = `Hi ${firstName},\n\nYour password reset code is: ${otp}\nThis code will expire in 10 minutes.\n\nIf you did not request this, please ignore this email.`;

    await this.sendMail(email, from, subject, text, html, otp, 'Password Reset');
  }

  private async sendMail(
    to: string,
    from: string,
    subject: string,
    text: string,
    html: string,
    otp: string,
    purpose: string,
  ): Promise<void> {
    if (!this.transporter) {
      this.logger.log(
        `[DEV/MOCK MAIL] To: ${to} | Subject: ${subject} | ${purpose} OTP: >>> ${otp} <<<`,
      );
      return;
    }

    try {
      await this.transporter.sendMail({
        to,
        from,
        subject,
        text,
        html,
      });
      this.logger.log(`Email successfully sent to ${to} (${purpose})`);
    } catch (error) {
      this.logger.error(
        `Failed to send email to ${to}: ${error.message}. Fallback OTP log: ${otp}`,
      );
    }
  }
}
