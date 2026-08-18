import {
  IsEmail,
  IsString,
  IsStrongPassword,
  MinLength,
} from 'class-validator';

export class CreateUserDto {
  @IsString()
  @MinLength(3, { message: 'Name must be at least 3 characters long' })
  name!: string;

  @IsEmail()
  email!: string;

  @IsStrongPassword(
    {
      minLength: 8,
      minLowercase: 1,
      minUppercase: 1,
      minNumbers: 1,
      minSymbols: 1,
    },
    {
      message:
        'Password must be at least 8 characters and include an uppercase letter, a lowercase letter, a number, and a symbol',
    },
  )
  password!: string;

  @IsString()
  confirmPassword!: string;
}
