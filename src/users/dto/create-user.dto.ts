import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class CreateUserDto {
  @IsEmail({}, { message: 'Некорректный email' })
  @IsNotEmpty({ message: 'Email не может быть пустым' })
  email!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(6, { message: 'Пароль должен быть не менее 6 символов' })
  password!: string;

  @IsString()
  @IsNotEmpty({ message: 'Имя не может быть пустым' })
  name!: string;
}
