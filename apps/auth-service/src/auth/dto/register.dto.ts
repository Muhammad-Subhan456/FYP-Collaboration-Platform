import {
  IsEmail,
  IsNotEmpty,
  MinLength,
} from 'class-validator';

export class RegisterDto {
  @IsNotEmpty()
  fullName!: string;

  @IsEmail()
  email!: string;

  @MinLength(8)
  password!: string;
}
