import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { AppLogger } from '../common/logger/logger.service';
import { MailService } from '../mail/mail.service';
import { SignedUser } from '../types';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginUserDto } from './dto/login-user.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { CreateUserDto } from './dto/signup-user.dto';
import { User } from './entities/user.entity';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    private logger: AppLogger,
    private jwtService: JwtService,
    private configService: ConfigService,
    private mailService: MailService,
  ) {}

  async signUp(createUserDto: CreateUserDto) {
    const { email, password, name, confirmPassword } = createUserDto;

    if (password !== confirmPassword) {
      throw new BadRequestException('Passwords do not match');
    }

    const existingUser = await this.usersRepository.findOneBy({ email });

    if (existingUser) throw new ConflictException('Email already exists');

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = this.usersRepository.create({
      email,
      name,
      password: hashedPassword,
    });

    await this.usersRepository.save(user);

    this.logger.log(`User-${user.email} created successfully`);
    await this.mailService.sendWelcomeEmail(user);

    return {
      message: 'User created successfully',
      data: {
        email,
        name,
        id: user.id,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    };
  }

  async signIn(loginUserDto: LoginUserDto) {
    const { email, password } = loginUserDto;
    const user = await this.usersRepository
      .createQueryBuilder('user')
      .addSelect('user.password')
      .where('user.email = :email', { email })
      .getOne();

    if (!user) {
      this.logger.warn(`Failed login attempt for ${email}`);

      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      this.logger.warn(`Failed login attempt for ${email}`);

      throw new UnauthorizedException('Invalid credentials');
    }

    const token = this.jwtService.sign({
      sub: user.id,
      email: user.email,
    });

    this.logger.log(`User-${email} log in successful`);

    return {
      message: 'User successfully logged in',
      data: {
        email: user.email,
        name: user.name,
        id: user.id,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        token,
      },
    };
  }

  async forgotPassword(forgotPasswordDto: ForgotPasswordDto) {
    const { email } = forgotPasswordDto;
    const existingUser = await this.usersRepository.findOneBy({ email });

    if (!existingUser) {
      return { message: 'Verification token sent to email' };
    }

    const token = this.jwtService.sign(
      {
        sub: existingUser.id,
        email: existingUser.email,
      },
      {
        secret: this.configService.get('JWT_RESET_SECRET'),
        expiresIn: this.configService.get('JWT_RESET_EXPIRES_IN'),
      },
    );

    await this.mailService.sendPasswordResetEmail(existingUser, token);

    return { message: 'Verification token sent to email' };
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto) {
    const { password, confirmPassword, token } = resetPasswordDto;

    if (password !== confirmPassword)
      throw new BadRequestException('Passwords do not match');

    try {
      const payload: SignedUser = this.jwtService.verify(token, {
        secret: this.configService.get<string>('JWT_RESET_SECRET'),
      });

      const existingUser = await this.usersRepository.findOneBy({
        id: payload.sub,
      });

      if (!existingUser) throw new UnauthorizedException('Invalid token');

      existingUser.password = await bcrypt.hash(password, 10);
      await this.usersRepository.save(existingUser);

      this.logger.log(`Password reset for user-${existingUser.email}`);

      return { message: 'Password reset successfully' };
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  async getUser(id: number | undefined) {
    const user = await this.usersRepository.findOneBy({ id });
    return { data: user };
  }
}
