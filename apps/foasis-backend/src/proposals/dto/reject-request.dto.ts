import { IsString, MinLength } from 'class-validator';

export class RejectRequestDto {
  @IsString()
  @MinLength(3)
  reason!: string;
}
