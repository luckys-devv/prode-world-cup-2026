// ═══════════════════════════════════════════════════
// SERVICIO DE AUTENTICACIÓN (LÓGICA DE NEGOCIO)
// ═══════════════════════════════════════════════════
// Este archivo contiene la lógica pura de autenticación.
// No sabe nada de HTTP, ni de req/res, ni de Express.
// Solo sabe: crear usuarios, verificar contraseñas, y generar tokens.
//
// ¿Por qué separar la lógica del controller?
// - Reutilización: podés llamar a register() desde un test, un seed, o un cron.
// - Testabilidad: podés testear la lógica sin levantar un servidor HTTP.
// - Claridad: el controller maneja HTTP, el service maneja reglas de negocio.

import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../../config/database.js';
import { env } from '../../config/env.js';
import { RegisterInput, LoginInput } from './auth.validation.js';

// ═══════════════════════════════════════════════════
// TIPOS DE RETORNO
// ═══════════════════════════════════════════════════

interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: number;
    email: string;
    displayName: string;
  };
}

// ═══════════════════════════════════════════════════
// FUNCIONES INTERNAS (helpers)
// ═══════════════════════════════════════════════════

// Genera un JWT (JSON Web Token) de acceso.
// Este token viaja en cada petición del front al back (en el header "Authorization").
// Dura 30 minutos. Después el frontend debe pedir uno nuevo con el refresh token.
//
// ¿Qué contiene el payload?
// - userId: para saber QUIÉN poronga hizo la petición
// - email: información adicional (opcional, pero útil para logs)
//
// jwt.sign() firma el payload con tu JWT_SECRET.
// Solo el servidor puede verificarlo.
// Si alguien intenta modificar el token, la firma no coincidirá y será rechazado.
function generateAccessToken(userId: number, email: string): string {
  return jwt.sign(
    { userId, email },       // Payload: datos que viajan dentro del token
    env.JWT_SECRET,          // Secreto para firmar (de tu .env)
    { expiresIn: '30m' }    // Expira en 30 minutos
  );
}

// Generamos un refresh token y lo guardamos en la base de datos.
// A diferencia del access token, el refresh token:
// - Es un UUID aleatorio
// - Dura 30 días
// - Se almacena en la BD para poder revocarlo (ej: al hacer logout)
// - Solo se usa para pedir un nuevo access token, NUNCA para acceder a rutas
async function generateRefreshToken(userId: number): Promise<string> {
  const token = uuidv4();

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30);

  // Verificamos que el token existe y no fue revocado al hacer refresh
  // Revocar TODOS los tokens de un usuario si sospechamos que le hackearon la cuenta
  await db.refreshToken.create({
    data: {
      token,
      userId,
      expiresAt,
    },
  });

  return token;
}

// ═══════════════════════════════════════════════════
// FUNCIONES PÚBLICAS (las que usa el controller)
// ═══════════════════════════════════════════════════

// ─── REGISTRO ──────────────────────────────────────
// Crea un usuario nuevo en la base de datos.
// Pasos:
// 1. Verificar que el email no esté registrado
// 2. Hashear la contraseña 
// 3. Crear el usuario en la BD
// 4. Buscar invitaciones pendientes que le hayan mandado a ese email
// 5. Generar tokens y devolver la respuesta
export async function register(input: RegisterInput): Promise<AuthResponse> {
  const { email, password, displayName } = input;

  // Paso 1
  const existingUser = await db.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    // Lanzamos un error personalizado con statusCode 409 (Conflict).
    // El errorHandler lo atrapará y responderá con el JSON correcto.
    const error = new Error('Ya existe una cuenta con este email') as any;
    error.statusCode = 409;
    throw error;
  }

  // Paso 2
  // El número 12 es el "salt rounds": cuántas vueltas de encriptación aplica.
  // Más vueltas = más seguro pero más lento. Ver como se comporta con 12 vueltas.
  const passwordHash = await bcrypt.hash(password, 12);

  // Paso 3
  // Prisma genera automáticamente los campos id, createdAt y updatedAt.
  const user = await db.user.create({
    data: {
      email,
      passwordHash,
      displayName,
    },
  });

  // Paso 4
  await db.invitation.updateMany({
    where: {
      email: user.email,
      receiverId: null,  // Solo las que no tienen usuario asignado
    },
    data: {
      receiverId: user.id,  // Ahora sí las vinculamos
    },
  });

  // Paso 5: Generamos los tokens de autenticación.
  const accessToken = generateAccessToken(user.id, user.email);
  const refreshToken = await generateRefreshToken(user.id);

  return {
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
    },
  };
}

// ─── LOGIN ─────────────────────────────────────────
// Verifica las credenciales y devuelve tokens si son correctas.
export async function login(input: LoginInput): Promise<AuthResponse> {
  const { email, password } = input;

  // Buscamos al usuario por email.
  const user = await db.user.findUnique({
    where: { email },
  });

  // Si no existe, devolvemos un error genérico.
  // IMPORTANTE: No decimos "el email no existe" porque eso le confirmaría
  // a un atacante que ese email está registrado. Es una buena práctica de seguridad.
  if (!user) {
    const error = new Error('Email o contraseña incorrectos') as any;
    error.statusCode = 401;
    throw error;
  }

  // bcrypt.compare() compara la contraseña en texto plano con el hash guardado.
  // Internamente, hashea la contraseña ingresada y la compara con el hash de la BD.
  // Devuelve true si coinciden, false si no.
  const passwordMatch = await bcrypt.compare(password, user.passwordHash);

  if (!passwordMatch) {
    const error = new Error('Email o contraseña incorrectos') as any;
    error.statusCode = 401;
    throw error;
  }

  // Credenciales correctas → generar tokens
  const accessToken = generateAccessToken(user.id, user.email);
  const refreshToken = await generateRefreshToken(user.id);

  return {
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
    },
  };
}

// ─── REFRESH ───────────────────────────────────────
// Recibe un refresh token expirado/válido y devuelve un nuevo par de tokens.
// El refresh token viejo se "revoca" (se marca como usado) para que no se pueda reutilizar.
export async function refresh(token: string): Promise<{ accessToken: string; refreshToken: string }> {
  // Buscamos el refresh token en la BD, incluyendo los datos del usuario.
  const storedToken = await db.refreshToken.findUnique({
    where: { token },
    include: { user: true },  // JOIN con la tabla users
  });

  // Verificaciones:
  // 1. ¿Existe el token? (no se inventaron uno)
  // 2. ¿Fue revocado? (ya se usó o se hizo logout)
  // 3. ¿Expiró? (pasaron más de 30 días)
  if (!storedToken || storedToken.revoked || storedToken.expiresAt < new Date()) {
    const error = new Error('Refresh token inválido o expirado') as any;
    error.statusCode = 401;
    throw error;
  }

  // Revocar el token viejo (marcarlo como "usado")
  await db.refreshToken.update({
    where: { id: storedToken.id },
    data: { revoked: true },
  });

  // Generar un nuevo par de tokens
  const accessToken = generateAccessToken(storedToken.user.id, storedToken.user.email);
  const newRefreshToken = await generateRefreshToken(storedToken.user.id);

  return {
    accessToken,
    refreshToken: newRefreshToken,
  };
}

// ─── LOGOUT ────────────────────────────────────────
// Revoca el refresh token actual. El access token seguirá funcionando
// hasta que expire (máximo 30 min), pero sin refresh token no podrán renovarlo.
//
export async function logout(token: string): Promise<void> {
  // Buscamos y revocamos el token. Si no existe, no pasa nada.
  await db.refreshToken.updateMany({
    where: {
      token,
      revoked: false,  // Solo revocar si no estaba ya revocado
    },
    data: { revoked: true },
  });
}