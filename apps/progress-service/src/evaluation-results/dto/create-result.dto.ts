import {
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateResultDto {
  @IsString()
  teamId!: string;

  @IsNumber()
  marks!: number;

  @IsOptional()
  @IsString()
  comments?: string;
}