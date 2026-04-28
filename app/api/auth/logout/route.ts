import { NextResponse } from "next/server";
import { clearAuthCookies } from "@utils/auth-cookies";

export async function POST(): Promise<Response> {
  const response = NextResponse.json(
    { message: "Logged out" },
    { status: 200, headers: { "Cache-Control": "no-store" } }
  );

  clearAuthCookies(response);

  return response;
}
