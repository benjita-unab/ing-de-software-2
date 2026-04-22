import { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { jsonResponse } from "@/lib/http";
import { verifyToken } from "@/lib/auth";

const PUBLIC_PATHS = new Set(["/api/auth/login", "/api/health"]);

export async function middleware(request: NextRequest) {
  if (request.method === "OPTIONS") {
    return new NextResponse(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Authorization, Content-Type",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS"
      }
    });
  }

  if (PUBLIC_PATHS.has(request.nextUrl.pathname)) {
    return NextResponse.next();
  }

  const token = request.headers.get("authorization")?.replace("Bearer ", "") ?? "";
  console.log("JWT recibido:", token);

  if (!token) {
    return jsonResponse({ error: "Missing bearer token" }, 401);
  }

  try {
    await verifyToken(token);
    return NextResponse.next();
  } catch (error) {
    console.error("Error validando JWT:", error);
    return jsonResponse({ error: "Invalid JWT" }, 401);
  }
}

export const config = {
  matcher: ["/api/:path*"]
};
