import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(_request: NextRequest) {
  // Keep the existing behavior from the legacy app: allow the request through.
  // This file provides the centralized hook for future auth redirects on these routes.
  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/login", "/register"],
};
