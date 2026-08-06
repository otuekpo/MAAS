export interface aResponse<T> {
  data: T;
  message: string;
  successful: boolean;
}
