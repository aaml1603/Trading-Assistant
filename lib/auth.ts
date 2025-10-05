import jwt from 'jsonwebtoken';
import { NextRequest } from 'next/server';

if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable must be set');
}

const JWT_SECRET: string = process.env.JWT_SECRET;

export interface JWTPayload {
  userId: string;
  email: string;
}

export function generateToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch {
    return null;
  }
}

export function getUserFromRequest(request: NextRequest): JWTPayload | null {
  const authHeader = request.headers.get('authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);
  return verifyToken(token);
}
