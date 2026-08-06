import { NewdevzEmail, SenderParameters } from "@app/shared/interfaces/email";
import {
  Sender,
  SendinBlueEmailModel,
  To,
} from "@app/shared/interfaces/emailService";
import { Injectable } from "@nestjs/common";

@Injectable()
export class BrevoService implements NewdevzEmail {
  private Domain: string;
  private ApiKey: string;
  private SenderEmail: string;
  private SenderName: string;
  private contactEmail: string;

  constructor() {
    const requiredFields = [
      "BrevoDomain",
      "BrevoApiKey",
      "BrevoSenderEmail",
      "BrevoSenderName",
      "CONTACT_EMAIL",
    ];

    for (const field of requiredFields) {
      if (!process.env[field]) {
        throw new Error(`Brevo email service needs ${field}`);
      }
    }

    this.Domain = process.env.BrevoDomain as string;
    this.ApiKey = process.env.BrevoApiKey as string;
    this.SenderEmail = process.env.BrevoSenderEmail as string;
    this.SenderName = process.env.BrevoSenderName as string;
    this.contactEmail = process.env.CONTACT_EMAIL as string;
  }

  /**
   *
   * @returns request headers for brevo
   */
  private createRequestHeaders() {
    const myHeaders = new Headers();
    myHeaders.append("Content-Type", "application/json");
    myHeaders.append("api-key", this.ApiKey ?? "");
    return myHeaders;
  }

  /**
   *
   * @returns the sender of this mail which is newdevz
   */
  private createSender(): Sender {
    return {
      email: this.SenderEmail,
      name: this.SenderName,
    };
  }

  /**
   *
   * @param name the user's name
   * @param email the user's email.
   * @returns an array of people who will recieve this email.
   */
  private createReceiver(name: string, email: string): To[] {
    return [{ name, email }];
  }

  /**
   *
   * @param sender the user sending the email, which is newdevz.
   * @param Subject the subject of the email.
   * @param toWho an array of user's who this email is being sent to.
   * @param htmlToSend the email to send to the user.
   * @returns the request body for brevo.
   */
  private createBrevoRequestBody(
    sender: Sender,
    Subject: string,
    toWho: To[],
    htmlToSend: string,
  ): SendinBlueEmailModel {
    return {
      sender,
      subject: Subject,
      to: toWho,
      htmlContent: htmlToSend,
    };
  }

  /**
   *
   * @param headers the request headers for brevo
   * @param requestBody the request body for brevo
   * @returns request options.
   */
  private createRequestOptions(
    headers: Headers,
    requestBody: SendinBlueEmailModel,
  ): RequestInit {
    return {
      method: "POST",
      headers,
      body: JSON.stringify(requestBody),
    };
  }

  async sendEmail({ html, to, subject }: SenderParameters) {
    /**
     * Create the sender.
     * This is newdevz.
     */
    const sender = this.createSender();

    /**
     * Creates an array of users who this email is to being sent to.
     */
    const receiver = this.createReceiver(to.split("@")[0], to);

    /**
     * Create request body.
     */
    const body = this.createBrevoRequestBody(sender, subject, receiver, html);

    /**
     * Create request headers.
     */
    const headers = this.createRequestHeaders();

    /**
     * Create request options.
     */
    const requestOptions = this.createRequestOptions(headers, body);

    /**
     * Make a request to brevo.
     * This is where the email is being sent.
     */
    const response = await fetch(this.Domain ?? "", requestOptions);

    if (!response.ok) {
      console.log(response);
      throw new Error("Failed to send email");
    }
  }
}
