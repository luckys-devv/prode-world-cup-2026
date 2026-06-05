// Punto de entrada del paquete shared.
// Re-exporta todos los tipos para que se puedan importar así:
//   import { Match, LoginRequest, Group } from '@prode/shared';

export * from './types/auth';
export * from './types/match';
export * from './types/group';
export * from './types/prediction';
export * from './types/api';