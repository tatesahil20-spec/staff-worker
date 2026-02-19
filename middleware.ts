import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
    const res = NextResponse.next()
    const supabase = createMiddlewareClient({ req, res })

    const {
        data: { session },
    } = await supabase.auth.getSession()

    // If there is no session and the user is trying to access a protected route,
    // redirect them to the login page.
    if (!session && req.nextUrl.pathname !== '/login') {
        return NextResponse.redirect(new URL('/login', req.url))
    }

    // If there is a session and the user is trying to access the login page,
    // redirect them to the home page (or wherever you want signed-in users to go).
    if (session && req.nextUrl.pathname === '/login') {
        return NextResponse.redirect(new URL('/home', req.url))
    }

    return res
}

export const config = {
    matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
