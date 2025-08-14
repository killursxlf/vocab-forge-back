import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class CreateUserDto {
  @IsEmail({}, { message: 'Некорректный email' })
  @IsNotEmpty({ message: 'Email не может быть пустым' })
  email: string;

  @IsString()
  @IsNotEmpty({ message: 'Пароль не может быть пустым' })
  @MinLength(6, { message: 'Пароль должен содержать минимум 6 символов' })
  password: string;
}