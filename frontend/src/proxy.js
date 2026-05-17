import { NextResponse } from 'next/server';

// 💡 Dependency-free helper to check if a JWT is expired on the Edge runtime
function isTokenExpired(token) {
  if (!token) return true;
  try {
    // JWTs look like: header.payload.signature. We want the payload.
    const payloadBase64 = token.split('.')[1];
    // Decode the base64 payload
    const decodedJson = Buffer.from(payloadBase64, 'base64').toString();
    const payload = JSON.parse(decodedJson);
    
    // JWT exp is in seconds, Date.now() is in milliseconds
    const expDate = payload.exp * 1000; 
    
    return Date.now() > expDate;
  } catch (error) {
    // If parsing fails (malformed token), assume it's invalid/expired
    return true; 
  }
}

export function proxy(request) {
  const url = request.nextUrl.pathname;
  const token = request.cookies.get('token')?.value;
  const role = request.cookies.get('role')?.value;
  
  // ==========================================
  // RULE 1: Dashboard is for logged-in & VALID users only
  // ==========================================
  if (url.startsWith('/dashboard')) {
    if (!token || isTokenExpired(token)) {
      // 💡 If expired, redirect to login AND clear the dead cookies
      const response = NextResponse.redirect(new URL('/login', request.url));
      response.cookies.delete('token');
      response.cookies.delete('role');
      return response;
    }
  }

  // ==========================================
  // RULE 2: Protect Admin-Only Routes
  // ==========================================
  const adminOnlyRoutes = [
    '/dashboard/agents/create'
  ];

  const isTryingToAccessAdminRoute = adminOnlyRoutes.some(route => url.startsWith(route));
  
  if (isTryingToAccessAdminRoute && role !== 'admin') {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // ==========================================
  // RULE 3: Don't let logged-in users see the Login page
  // ==========================================
  if (url === '/login' && token && !isTokenExpired(token)) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/dashboard/:path*', 
    '/login'             
  ]
};