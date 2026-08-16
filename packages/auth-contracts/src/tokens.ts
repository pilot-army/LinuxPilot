export type TokenPayload = {
  sub: string;
  sid: string;
  email: string;
  username: string;
  roles: string[];
  permissions: string[];
};

export type TokenPair = {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
};
