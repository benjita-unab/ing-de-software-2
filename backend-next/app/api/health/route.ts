import { jsonResponse, optionsResponse } from "@/lib/http";

export async function OPTIONS() {
  return optionsResponse();
}

export async function GET() {
  return jsonResponse({
    ok: true,
    service: "backend-next",
    timestamp: new Date().toISOString()
  });
}
