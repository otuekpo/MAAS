import { Module } from "@nestjs/common";
// import { EmailService } from "./email.service";
import { NodemailerService } from "./nodemailer.service";
import { BrevoService } from "./brevo/brevo.service";
import { ZeptoService } from "./zepto/zepto.service";
import { EMAIL_TOKEN } from "@app/shared/constants/emailServiceToken";

function loadService():
  typeof BrevoService | typeof NodemailerService | typeof ZeptoService {
  if (process.env.EMAIL_SERVICE === "BREVO") {
    return BrevoService;
  } else if (process.env.EMAIL_SERVICE === "ZEPTO") {
    return ZeptoService;
  } else {
    return NodemailerService;
  }
}

@Module({
  providers: [
    {
      provide: EMAIL_TOKEN,
      useClass: loadService(),
    },
  ],
  exports: [EMAIL_TOKEN],
})
export class EmailModule {
  constructor() {
    const service = loadService();
    console.log(`${service.name} has been registered`);
  }
}
