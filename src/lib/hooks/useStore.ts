/**
 * Custom hooks for working with nanostores in React components
 */

import { useState, useEffect, useCallback } from 'react'
import type { Atom, MapStore, ReadableAtom } from 'nanostores'
import { batchUpdate } from '@/lib/stores/storeUtils'

/**
 * Hook to use a nanostore atom in a React component
 *
 * @param store - Nanostore atom or map
 * @returns Current store value
 */
export function useStore<T>(store: ReadableAtom<T>): T {
	const [value, setValue] = useState<T>(store.get())

	useEffect(() => {
		// Subscribe to store changes
		const unsubscribe = store.subscribe(setValue)

		// Unsubscribe on cleanup
		return unsubscribe
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
			store.setKey(key, value)
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
			store.set(newValue)
		},
		[store]
	)

	return [value, setValue]
}

/**
 * Hook to use a derived value from a store
 *
 * @param store - Source store
 * @param selector - Function to derive value
 * @returns Derived value
 */
export function useDerivedStore<S, T>(store: ReadableAtom<S>, selector: (state: S) => T): T {
	const state = useStore(store)
	return selector(state)
}
