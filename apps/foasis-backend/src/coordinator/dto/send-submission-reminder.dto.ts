import { IsString } from 'class-validator';

export class SendSubmissionReminderDto {
  @IsString()
  templateId!: string;

  @IsString()
  supervisorId!: string;
}
