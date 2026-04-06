import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Fonksiyonun adı mutlaka 'middleware' olmalı
export function middleware(request: NextRequest) {
  // Şimdilik sadece isteğin devam etmesine izin veriyoruz
  return NextResponse.next()
}

// Hangi sayfalarda çalışacağını belirleyen kısım
export const config = {
  matcher: ['/dashboard/:path*', '/login', '/register'],
}