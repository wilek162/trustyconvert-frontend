/**
 * Logger utility for handling application logging
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogEntry {
	timestamp: string
	level: LogLevel
	message: string
	data?: any
	error?: Error
}

interface LoggerOptions {
	minLevel?: LogLevel
	enableConsole?: boolean
	enableStorage?: boolean
	maxStorageEntries?: number
	prefix?: string
}

class Logger {
	private minLevel: LogLevel
	private enableConsole: boolean
	private enableStorage: boolean
	private maxStorageEntries: number
	private prefix: string
	private storageKey: string

	constructor(options: LoggerOptions = {}) {
		this.minLevel = options.minLevel || 'info'
		this.enableConsole = options.enableConsole ?? true
		this.enableStorage = options.enableStorage ?? false
		this.maxStorageEntries = options.maxStorageEntries || 1000
		this.prefix = options.prefix || 'trustyconvert'
		this.storageKey = `${this.prefix}_logs`
	}

	private getTimestamp(): string {
		return new Date().toISOString()
	}

	private shouldLog(level: LogLevel): boolean {
		const levels: LogLevel[] = ['debug', 'info', 'warn', 'error']
		return levels.indexOf(level) >= levels.indexOf(this.minLevel)
	}

	private formatMessage(entry: LogEntry): string {
		const { timestamp, level, message, data, error } = entry
		let formattedMessage = `[${timestamp}] ${level.toUpperCase()}: ${message}`

		if (data) {
			formattedMessage += `\nData: ${JSON.stringify(data, null, 2)}`
		}

		if (error) {
			formattedMessage += `\nError: ${error.message}\nStack: ${error.stack}`
		}

		return formattedMessage
	}

	private logToConsole(entry: LogEntry): void {
		if (!this.enableConsole) return

		const { level, message, data, error } = entry
		const formattedMessage = this.formatMessage(entry)

		switch (level) {
			case 'debug':
				console.debug(formattedMessage)
				break
			case 'info':
				console.info(formattedMessage)
				break
			case 'warn':
				console.warn(formattedMessage)
				break
			case 'error':
				console.error(formattedMessage)
				break
		}
	}

	private async logToStorage(entry: LogEntry): Promise<void> {
		if (!this.enableStorage) return

		try {
			const logs = this.getStoredLogs()
			logs.unshift(entry)

			// Trim logs if they exceed maxStorageEntries
			if (logs.length > this.maxStorageEntries) {
				logs.length = this.maxStorageEntries
			}

			localStorage.setItem(this.storageKey, JSON.stringify(logs))
		} catch (error) {
			console.error('Error storing log entry:', error)
		}
	}

	private getStoredLogs(): LogEntry[] {
		try {
			const logs = localStorage.getItem(this.storageKey)
			return logs ? JSON.parse(logs) : []
		} catch (error) {
			console.error('Error retrieving stored logs:', error)
			return []
		}
	}

	private async log(level: LogLevel, message: string, data?: any, error?: Error): Promise<void> {
		if (!this.shouldLog(level)) return

		const entry: LogEntry = {
			timestamp: this.getTimestamp(),
			level,
			message,
			data,
			error
		}

		this.logToConsole(entry)
		await this.logToStorage(entry)
	}

	debug(message: string, data?: any): void {
		this.log('debug', message, data)
	}

	info(message: string, data?: any): void {
		this.log('info', message, data)
	}

	warn(message: string, data?: any): void {
		this.log('warn', message, data)
	}

	error(message: string, error?: Error, data?: any): void {
		this.log('error', message, data, error)
	}

	getLogs(): LogEntry[] {
		return this.getStoredLogs()
	}

	clearLogs(): void {
		if (this.enableStorage) {
			localStorage.removeItem(this.storageKey)
		}
	}
}

// Create a default instance with common options
export const logger = new Logger({
	minLevel: process.env.NODE_ENV === 'development' ? 'debug' : 'info',
	enableConsole: true,
	enableStorage: process.env.NODE_ENV === 'development',
	maxStorageEntries: 1000,
	prefix: 'trustyconvert'
})
