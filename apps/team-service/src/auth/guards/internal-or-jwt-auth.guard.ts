import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class InternalOrJwtAuthGuard
  extends AuthGuard('jwt')
{
  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    const apiKey = request.headers['x-internal-api-key'];

    if (
      process.env.INTERNAL_API_KEY &&
      apiKey === process.env.INTERNAL_API_KEY
    ) {
      return true;
    }

    return super.canActivate(context);
  }

  handleRequest(err: any, user: any) {
    if (err || !user) {
      throw (
        err ||
        new UnauthorizedException('Authentication required')
      );
    }

    return user;
  }
}
