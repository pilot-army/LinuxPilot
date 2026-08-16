import { Module } from '@nestjs/common';
import { PasswordService } from '../../common/crypto/password.service';
import { SessionsModule } from '../sessions/sessions.module';
import { UsersModule } from '../users/users.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { TokenService } from './token.service';

@Module({
  imports: [UsersModule, SessionsModule],
  controllers: [AuthController],
  providers: [AuthService, TokenService, PasswordService],
  exports: [AuthService, TokenService, PasswordService],
})
export class AuthModule {}
