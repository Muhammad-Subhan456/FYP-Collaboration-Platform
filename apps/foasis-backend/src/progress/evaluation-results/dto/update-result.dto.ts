import {
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class UpdateResultDto {
  @IsNumber()
  @Min(0)
  @Max(100)
  marks!: number;

  @IsOptional()
  @IsString()
  comments?: string;
}
