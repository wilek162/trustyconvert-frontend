/**
 * Store Utilities
 *
 * Helper functions and utilities for working with nanostores
 * to ensure consistent patterns across the application.
 */

import { atom, map, type MapStore, type Atom } from 'nanostores'
import { debugLog } from '@/lib/utils/debug'

/**
 * Create a persistent atom that saves to localStorage
 *
 * @param key - localStorage key
 * @param initialValue - Initial value
 * @returns Atom with persistence
 */
export function createPersistentAtom<T>(key: string, initialValue: T): Atom<T> {
	// Create the atom
	const store = atom<T>(initialValue)

	// Try to load initial value from localStorage
	if (typeof window !== 'undefined') {
		try {
			const storedValue = localStorage.getItem(key)
			if (storedValue) {
				store.set(JSON.parse(storedValue) as T)
			}
		} catch (error) {
			console.error(`Error loading ${key} from localStorage:`, error)
		}
	}

	// Subscribe to changes and save to localStorage
	store.subscribe((value) => {
		if (typeof window !== 'undefined') {
			try {
				localStorage.setItem(key, JSON.stringify(value))
			} catch (error) {
				console.error(`Error saving ${key} to localStorage:`, error)
			}
		}
	})

	return store
}

/**
 * Create a store with loading, error, and data states
 *
 * @param initialData - Initial data value
 * @returns Store with loading states
 */
export function createLoadableStore<T>(initialData: T) {
	return map({
		loading: false,
		error: null as string | null,
		data: initialData
	})
}

/**
 * Helper to safely update a map store
 *
 * @param store - Map store to update
 * @param key - Key to update
 * @param value - New value
 */
export function safeSetKey<T extends object>(
	store: MapStore<T>,
	key: keyof T,
	value: T[keyof T]
): void {
	try {
		store.setKey(key, value)
	} catch (error) {
		debugLog(`Error updating store key ${String(key)}:`, error)
	}
}

/**
 * Create a derived store that depends on another store
 *
 * @param sourceStore - Source store
 * @param deriveFn - Function to derive new value
 * @returns Derived atom
 */
export function createDerivedStore<S, T>(
	sourceStore: Atom<S> | MapStore<S>,
	deriveFn: (sourceValue: S) => T
): Atom<T> {
	// Create derived store
	const derivedStore = atom<T>(deriveFn(sourceStore.get()))

	// Update derived store when source changes
	sourceStore.subscribe((newValue) => {
		derivedStore.set(deriveFn(newValue))
	})

	return derivedStore
}

/**
 * Helper to safely batch multiple updates to a map store
 *
 * @param store - Map store to update
 * @param updates - Object with updates
 */
export function batchUpdate<T extends object>(store: MapStore<T>, updates: Partial<T>): void {
	try {
		store.set({
			...store.get(),
			...updates
		})
	} catch (error) {
		debugLog('Error batch updating store:', error)
	}
}
