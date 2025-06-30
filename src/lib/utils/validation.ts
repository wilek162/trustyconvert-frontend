/**
 * Validation utilities for handling input validation
 */

import { ValidationError } from './error'

interface ValidationRule<T> {
	validate: (value: T) => boolean
	message: string
}

// Fixed the ValidationSchema interface
type ValidationSchema<T> = {
	[K in keyof T]?: ValidationRule<T[K]>[]
}

export class Validator<T extends Record<string, any>> {
	private schema: ValidationSchema<T>

	constructor(schema: ValidationSchema<T>) {
		this.schema = schema
	}

	validate(data: Partial<T>): void {
		const errors: Record<string, string[]> = {}

		for (const [key, rules] of Object.entries(this.schema)) {
			const value = data[key]
			const fieldErrors: string[] = []

			if (rules) {
				for (const rule of rules) {
					if (!rule.validate(value)) {
						fieldErrors.push(rule.message)
					}
				}
			}

			if (fieldErrors.length > 0) {
				errors[key] = fieldErrors
			}
		}

		if (Object.keys(errors).length > 0) {
			throw new ValidationError('Validation failed', errors)
		}
	}
}

// Common validation rules
export const rules = {
	required: (message = 'This field is required'): ValidationRule<any> => ({
		validate: (value) => value !== undefined && value !== null && value !== '',
		message
	}),

	minLength: (min: number, message?: string): ValidationRule<string> => ({
		validate: (value) => typeof value === 'string' && value.length >= min,
		message: message || `Must be at least ${min} characters`
	}),

	maxLength: (max: number, message?: string): ValidationRule<string> => ({
		validate: (value) => typeof value === 'string' && value.length <= max,
		message: message || `Must be at most ${max} characters`
	}),

	pattern: (regex: RegExp, message: string): ValidationRule<string> => ({
		validate: (value) => typeof value === 'string' && regex.test(value),
		message
	}),

	email: (message = 'Invalid email address'): ValidationRule<string> => ({
		validate: (value) =>
			typeof value === 'string' && /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(value),
		message
	}),

	min: (min: number, message?: string): ValidationRule<number> => ({
		validate: (value) => typeof value === 'number' && value >= min,
		message: message || `Must be at least ${min}`
	}),

	max: (max: number, message?: string): ValidationRule<number> => ({
		validate: (value) => typeof value === 'number' && value <= max,
		message: message || `Must be at most ${max}`
	}),

	fileSize: (maxSize: number, message?: string): ValidationRule<File> => ({
		validate: (value) => value instanceof File && value.size <= maxSize,
		message: message || `File size must be at most ${maxSize} bytes`
	}),

	fileType: (allowedTypes: string[], message?: string): ValidationRule<File> => ({
		validate: (value) => value instanceof File && allowedTypes.includes(value.type),
		message: message || `File type must be one of: ${allowedTypes.join(', ')}`
	})
}

// Example usage:
/*
const userSchema = {
  email: [rules.required(), rules.email()],
  password: [
    rules.required(),
    rules.minLength(8),
    rules.pattern(/[A-Z]/, 'Must contain at least one uppercase letter'),
    rules.pattern(/[a-z]/, 'Must contain at least one lowercase letter'),
    rules.pattern(/[0-9]/, 'Must contain at least one number')
  ],
  age: [rules.min(18)]
}

const validator = new Validator(userSchema)

try {
  validator.validate({
    email: 'user@example.com',
    password: 'Password123',
    age: 20
  })
} catch (error) {
  if (error instanceof ValidationError) {
    console.error(error.details)
  }
}
*/
