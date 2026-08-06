import { NewdevzEmail, SenderParameters } from "@app/shared/interfaces/email";
import { Injectable } from "@nestjs/common";
import dotenv from "dotenv";

dotenv.config();

@Injectable()
export class ZeptoService implements NewdevzEmail {
  private AuthKey: string = process.env.AUTH_KEY || "";

  // sendEmailSMTP(to: string, subject: string, body: string): Promise<void> {
  //     // Implementation for sending email using Zepto
  //     var nodemailer = require('nodemailer');
  //     var transport = nodemailer.createTransport({
  //         host: "smtp.zeptomail.com",
  //         port: 587,
  //         auth: {
  //             user: "emailapikey",
  //             pass: "wSsVR60gqx+iCKp/yDWpL+85z1oBBgn/Fxgr0FCguCX6S/nC8sczxESbAgeuSfZJQ2doQDBHpuovzkoIgzILhtwow14GCSiF9mqRe1U4J3x17qnvhDzPWm5VkBWJKo8PxAtvnmlgGswi+g=="
  //         }
  //     });

  //     var mailOptions = {
  //         from: '"Development Team" <noreply@medinfocard.org>',
  //         to: to,
  //         subject: subject,
  //         html: body,
  //     };

  //     transport.sendMail(mailOptions, (error, info) => {
  //         if (error) {
  //             return console.log(error);
  //         }
  //         console.log('Successfully sent');
  //     });
  //     return Promise.resolve();
  // }
  async sendEmail({ html: body, subject, to }: SenderParameters) {
    const myHeaders = new Headers();
    myHeaders.append("Authorization", this.AuthKey);
    myHeaders.append("Content-Type", "application/json");
    myHeaders.append("Accept", "application/json");

    const raw = JSON.stringify({
      from: {
        address: "noreply@medinfocard.org",
      },
      to: [
        {
          email_address: {
            address: to,
            name: "Imedservice",
          },
        },
      ],
      subject: subject,
      htmlbody: "<div><b> " + body + " </b></div>",
    });

    const requestOptions: RequestInit = {
      method: "POST",
      headers: myHeaders,
      body: raw,
      redirect: "follow",
    };
    const res = await fetch(
      "https://api.zeptomail.com/v1.1/email",
      requestOptions,
    );

    if (!res.ok) {
      const text = await res.text();
      console.log(text);
      throw new Error("Failed to send email");
    }
    return res.json();
  }
}

/*
sample response
{"data": [{"additional_info": [], "code": "EM_104", "message": "Email request received"}], "message": "OK", 
"object": "email", "request_id": "2d6f.3e7170efaf5fdbfa.m1.b22b5451-b8b9-11f0-86d4-963d1902c9da.19a49ec4e14"}
*/
