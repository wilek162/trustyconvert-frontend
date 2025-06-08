/**
 * @deprecated This file is kept for backward compatibility.
 * Please import directly from '@/lib/errors/*' instead.
 *
 * Example:
 * ```ts
 * // Import error types
 * import { ApiError, NetworkError } from '@/lib/errors/error-types';
 *
 * // Import error logger
 * import { errorLogger } from '@/lib/errors/error-logger';
 *
 * // Import error boundary (for React components)
 * import { ErrorBoundary } from '@/components/common/ErrorBoundary';
 * ```
 *
 * The new modular structure provides:
 * - Better separation of concerns
 * - Improved maintainability
 * - Easier testing
 * - Better tree-shaking
 */

export * from "./errors/index";
