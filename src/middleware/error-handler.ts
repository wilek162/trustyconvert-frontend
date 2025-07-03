import type { APIContext, MiddlewareNext } from "astro";
import { errorLogger, ApiError } from "@/lib/errors";
import { errorHandlingService } from "@/lib/errors/errorHandlingService";

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
          message: import.meta.env.DEV
            ? (error as Error).message
            : "An unexpected error occurred",
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // For non-API routes, try to recover from the error
    try {
      const { recovered } = await errorHandlingService.handleError(error, {
        context: {
          component: 'middleware',
          url: url.pathname,
          recoverable: true
        },
        showToast: false // Don't show toast from middleware, page will handle it
      });

      if (recovered) {
        // If we recovered, try the request again
        return await next();
      }
    } catch (recoveryError) {
      // If recovery fails, continue with normal error handling
      console.error('Error recovery failed:', recoveryError);
    }

    // For page routes, return a redirect to the error page
    const errorMessage = encodeURIComponent(
      error instanceof Error ? error.message : "Unknown error"
    );
    const errorType = encodeURIComponent(
      error instanceof Error ? error.name : "Error"
    );
    
    return Response.redirect(
      `${url.origin}/error?message=${errorMessage}&type=${errorType}`,
      302
    );
  }
}
