'use server';

import { cookies } from 'next/headers';
import { AuthUser } from '@/lib/types';

export async function setSessionCookie(user: AuthUser) {
    const cookieStore = await cookies();
    cookieStore.set('session_user', JSON.stringify(user), {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 // 1 day
    });
}

export async function clearSessionCookie() {
    const cookieStore = await cookies();
    cookieStore.delete('session_user');
}

export async function getSessionUser(): Promise<AuthUser | null> {
    const cookieStore = await cookies();
    const session = cookieStore.get('session_user');
    if (!session?.value) return null;
    try {
        return JSON.parse(session.value);
    } catch {
        return null;
    }
}
