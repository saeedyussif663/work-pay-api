import { Body, Controller, Patch, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginUserDto } from './dto/login-user.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { CreateUserDto } from './dto/signup-user.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('signup')
  signup(@Body() createUserBody: CreateUserDto) {
    return this.authService.signUp(createUserBody);
  }

  @Post('signin')
  login(@Body() loginUserBody: LoginUserDto) {
    return this.authService.signIn(loginUserBody);
  }

  @Post('forgot-password')
  forgotPassword(@Body() forgotPasswordBody: ForgotPasswordDto) {
    return this.authService.forgotPassword(forgotPasswordBody);
  }

  @Patch('reset-password')
  resetPassword(@Body() resetPasswordBody: ResetPasswordDto) {
    return this.authService.resetPassword(resetPasswordBody);
  }
}
