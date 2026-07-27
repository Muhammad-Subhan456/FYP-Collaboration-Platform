import { Global, Module } from '@nestjs/common';

import { EmailService } from './email.service';
import { resolveEmailProviderName } from './email.config';
import { EMAIL_PROVIDER } from './providers/email-provider.token';
import { LogEmailProvider } from './providers/log.provider';
import { ResendEmailProvider } from './providers/resend.provider';
import { SmtpEmailProvider } from './providers/smtp.provider';

@Global()
@Module({
  providers: [
    ResendEmailProvider,
    SmtpEmailProvider,
    LogEmailProvider,
    {
      provide: EMAIL_PROVIDER,
      useFactory: (
        resend: ResendEmailProvider,
        smtp: SmtpEmailProvider,
        log: LogEmailProvider,
      ) => {
        const name = resolveEmailProviderName();
        switch (name) {
          case 'smtp':
            return smtp;
          case 'log':
            return log;
          case 'resend':
          default:
            return resend;
        }
      },
      inject: [ResendEmailProvider, SmtpEmailProvider, LogEmailProvider],
    },
    EmailService,
  ],
  exports: [EmailService],
})
export class EmailModule {}
