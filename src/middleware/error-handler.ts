import type { APIContext, MiddlewareNext } from "astro";

import { errorLogger , ApiError } from "@/lib/errors";


export async function errorHandler(
  { request, url }: APIContext,
  next: MiddlewareNext
) {
  try {
    const response = await next();
    return response;
  } catch (error) {
    // Log the error
    errorLogger.logError(error as Error);

    // Handle API errors
    if (url.pathname.startsWith("/api/")) {
      if (error instanceof ApiError) {
        return new Response(
          JSON.stringify({
            error: error.message,
            code: error.code,
            details: error.details,
          }),
          {
            status: error.statusCode,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      return new Response(
        JSON.stringify({
          error: "Internal Server Error",
          code: "INTERNAL_ERROR",
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // For page routes, redirect to error page
    const searchParams = new URLSearchParams({
      message: (error as Error).message,
      status: "500",
    });

    return Response.redirect(
      `${url.origin}/error?${searchParams.toString()}`,
      302
    );
  }
}
