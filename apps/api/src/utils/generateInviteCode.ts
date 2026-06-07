/**
 * Genera un código alfanumérico aleatorio en mayúsculas.
 * @param length Longitud del código (por defecto 8 caracteres)
*/
export function generateInviteCode(length: number = 8): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}