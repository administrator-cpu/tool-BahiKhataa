import { NextResponse } from 'next/server';

// 💡 Change the function name from middleware to proxy
export function proxy(request) {
  const url = request.nextUrl.pathname;
  const token = request.cookies.get('token')?.value;
  const role = request.cookies.get('role')?.value;
  


  // ==========================================
  // RULE 1: Dashboard is for logged-in users only
  // ==========================================
  if (url.startsWith('/dashboard') && !token) {
    return NextResponse.redirect(new URL('/login', request.url));
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
  if (url === '/login' && token && token.length > 20) {
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