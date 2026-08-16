export type LoginCredentials = {
  email: string;
  password: string;
  rememberMe: boolean;
};

type Authenticate = (email: string, password: string) => Promise<void>;

export async function submitLogin(
  credentials: LoginCredentials,
  authenticate: Authenticate,
): Promise<void> {
  await authenticate(credentials.email.trim(), credentials.password);
}
