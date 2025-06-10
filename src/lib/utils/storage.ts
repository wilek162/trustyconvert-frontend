/**
 * Storage utilities for handling local storage and session storage operations
 */

interface StorageOptions {
	prefix?: string
	expiration?: number // in milliseconds
}

class Storage {
	private prefix: string
	private expiration: number | null

	constructor(options: StorageOptions = {}) {
		this.prefix = options.prefix || 'trustyconvert_'
		this.expiration = options.expiration || null
	}

	private getKey(key: string): string {
		return `${this.prefix}${key}`
	}

	private getItem(key: string): string | null {
		try {
			return localStorage.getItem(this.getKey(key))
		} catch (error) {
			console.error('Error reading from localStorage:', error)
			return null
		}
	}

	private setItem(key: string, value: string): void {
		try {
			localStorage.setItem(this.getKey(key), value)
		} catch (error) {
			console.error('Error writing to localStorage:', error)
		}
	}

	private removeItem(key: string): void {
		try {
			localStorage.removeItem(this.getKey(key))
		} catch (error) {
			console.error('Error removing from localStorage:', error)
		}
	}

	get<T>(key: string): T | null {
		const item = this.getItem(key)
		if (!item) return null

		try {
			const { value, timestamp } = JSON.parse(item)

			// Check if the item has expired
			if (this.expiration && timestamp) {
				const now = Date.now()
				if (now - timestamp > this.expiration) {
					this.remove(key)
					return null
				}
			}

			return value as T
		} catch (error) {
			console.error('Error parsing stored value:', error)
			return null
		}
	}

	set<T>(key: string, value: T): void {
		const item = {
			value,
			timestamp: Date.now()
		}
		this.setItem(key, JSON.stringify(item))
	}

	remove(key: string): void {
		this.removeItem(key)
	}

	clear(): void {
		try {
			const keys = Object.keys(localStorage)
			keys.forEach((key) => {
				if (key.startsWith(this.prefix)) {
					localStorage.removeItem(key)
				}
			})
		} catch (error) {
			console.error('Error clearing storage:', error)
		}
	}

	// Session storage methods
	private getSessionItem(key: string): string | null {
		try {
			return sessionStorage.getItem(this.getKey(key))
		} catch (error) {
			console.error('Error reading from sessionStorage:', error)
			return null
		}
	}

	private setSessionItem(key: string, value: string): void {
		try {
			sessionStorage.setItem(this.getKey(key), value)
		} catch (error) {
			console.error('Error writing to sessionStorage:', error)
		}
	}

	private removeSessionItem(key: string): void {
		try {
			sessionStorage.removeItem(this.getKey(key))
		} catch (error) {
			console.error('Error removing from sessionStorage:', error)
		}
	}

	getSession<T>(key: string): T | null {
		const item = this.getSessionItem(key)
		if (!item) return null

		try {
			const { value, timestamp } = JSON.parse(item)

			// Check if the item has expired
			if (this.expiration && timestamp) {
				const now = Date.now()
				if (now - timestamp > this.expiration) {
					this.removeSession(key)
					return null
				}
			}

			return value as T
		} catch (error) {
			console.error('Error parsing stored session value:', error)
			return null
		}
	}

	setSession<T>(key: string, value: T): void {
		const item = {
			value,
			timestamp: Date.now()
		}
		this.setSessionItem(key, JSON.stringify(item))
	}

	removeSession(key: string): void {
		this.removeSessionItem(key)
	}

	clearSession(): void {
		try {
			const keys = Object.keys(sessionStorage)
			keys.forEach((key) => {
				if (key.startsWith(this.prefix)) {
					sessionStorage.removeItem(key)
				}
			})
		} catch (error) {
			console.error('Error clearing session storage:', error)
		}
	}
}

// Create a default instance with common options
export const storage = new Storage({
	prefix: 'trustyconvert_',
	expiration: 24 * 60 * 60 * 1000 // 24 hours
})

// Create a session instance
export const sessionStorage = new Storage({
	prefix: 'trustyconvert_session_',
	expiration: 30 * 60 * 1000 // 30 minutes
})
