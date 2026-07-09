import { SetMetadata } from '@nestjs/common';

export const SKIP_WORKSPACE_KEY = 'skipWorkspace';

export const SkipWorkspace = () => SetMetadata(SKIP_WORKSPACE_KEY, true);
