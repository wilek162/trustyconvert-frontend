/**
 * Custom hooks for working with nanostores in React components
 */

import { useState, useEffect, useCallback } from 'react'
import type { Atom, MapStore, ReadableAtom } from 'nanostores'
import { batchUpdate } from '@/lib/stores/storeUtils'

/**
 * React hook for subscribing to a nanostore
 * 
 * @param store Any readable nanostore (atom, map, computed)
 * @returns The current store value
 */
export function useStore<T>(store: ReadableAtom<T>): T {
	const [value, setValue] = useState<T>(store.get())

	useEffect(() => {
		// Subscribe to store changes
		const unsubscribe = store.subscribe((newValue) => {
			setValue(newValue)
		})

		// Cleanup subscription
		return () => unsubscribe()
	}, [store])

	return value
}

/**
 * Hook to use a nanostore map with update helpers
 *
 * @param store - Nanostore map store
 * @returns [value, updateFn, setKeyFn]
 */
export function useMapStore<T extends object>(
	store: MapStore<T>
): [T, (updates: Partial<T>) => void, <K extends keyof T>(key: K, value: T[K]) => void] {
	const value = useStore(store)

	// Update function
	const updateStore = useCallback(
		(updates: Partial<T>) => {
			batchUpdate(store, updates)
		},
		[store]
	)

	// Set key function
	const setKey = useCallback(
		<K extends keyof T>(key: K, value: T[K]) => {
			// Use type assertion to fix the linter error
			store.setKey(key as any, value)
		},
		[store]
	)

	return [value, updateStore, setKey]
}

/**
 * Hook to use a nanostore atom with setter
 *
 * @param store - Nanostore atom
 * @returns [value, setValue]
 */
export function useAtomStore<T>(store: Atom<T>): [T, (value: T) => void] {
	const value = useStore(store)

	const setValue = useCallback(
		(newValue: T) => {
			// Use the atom's set method
			(store as any).set(newValue)
		},
		[store]
	)

	return [value, setValue]
}
