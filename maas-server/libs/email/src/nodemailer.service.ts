import { Injectable } from "@nestjs/common";
import * as nodemailer from "nodemailer";
import * as dotenv from "dotenv";
import { NewdevzEmail, SenderParameters } from "@app/shared/interfaces/email";

dotenv.config();

@Injectable()
export class NodemailerService implements NewdevzEmail {
  private transporter: nodemailer.Transporter;
  private user: string;
  private contactEmail: string;

  constructor() {
    const host = process.env.SMTP_HOST;
    const port = process.env.SMTP_PORT;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (!host || !user || !pass || !process.env.CONTACT_EMAIL) {
      throw new Error("Nodemailer credentials are missing");
    }

    this.user = user;
    this.contactEmail = process.env.CONTACT_EMAIL;

    this.transporter = nodemailer.createTransport({
      host,
      port: Number(port) || 587,
      secure: Number(port) === 465, // true for 465, false for others
      auth: {
        user,
        pass,
      },
    });
  }

  /**
   * Sends mail.
   * @param to recipient.
   * @param subject subject.
   * @param html the email
   * @param from default will be the user
   * @returns
   */
  async sendEmail({ html, to, subject }: SenderParameters) {
    try {
      const mailOptions = {
        from: `"MaaS" <${this.user}>`,
        to,
        subject,
        html,
      };

      const info = await this.transporter.sendMail(mailOptions);
      return info;
    } catch (error) {
      console.error("Error sending email:", error);
      throw new Error("Failed to send email");
    }
  }
}
