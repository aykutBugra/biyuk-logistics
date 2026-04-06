// src/proxy.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function proxy(request: NextRequest) {
  // Şimdilik herkes geçebilir
  return NextResponse.next()
}

// Hangi yollarda çalışacağını buraya yazıyoruz
export const config = {
  matcher: ['/dashboard/:path*', '/login', '/register'],
}