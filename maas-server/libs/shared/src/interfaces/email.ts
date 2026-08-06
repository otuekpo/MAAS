export interface NewdevzEmail {
  sendEmail: (params: SenderParameters) => Promise<any>;
}

export interface SenderParameters {
  to: string; // Reciever
  subject: string; // email subject
  html: string; // html
}
