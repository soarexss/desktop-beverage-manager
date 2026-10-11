import { Matches, ValidationOptions } from 'class-validator';

// Prisma-generated CUIDs. UUID is reserved for client-generated request IDs.
export function IsEntityId(options?: ValidationOptions) {
  return Matches(/^c[a-z0-9]{24}$/, {
    message: '$property deve ser um CUID válido',
    ...options,
  });
}
