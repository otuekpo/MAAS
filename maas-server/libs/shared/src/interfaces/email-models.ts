export interface ConfirmEmailModel {
  email: string;
  firstName: string | undefined;
  token: string;
}

export interface ResetPasswordEmailModel {
  email: string;
  firstName: string | undefined;
  token: string;
  expiresIn: Date;
}

export interface TwoFactorEmailModel {
  status: string;
  firstName: string | undefined;
  email: string;
}

export interface SendTwoFactorEmailModel {
  email: string;
  userName: string | undefined;
  code: string;
}
