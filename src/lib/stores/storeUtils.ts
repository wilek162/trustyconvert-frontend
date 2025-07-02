/**
 * Store Utilities
 *
 * Helper functions and utilities for working with nanostores
 * to ensure consistent patterns across the application.
 */

import { atom, map, type MapStore, type Atom } from 'nanostores'
import { debugLog, debugError } from '@/lib/utils/debug'

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

/**
 * Create an API-connected store with loading, error, and data states
 * 
 * @param initialData - Initial data value
 * @param options - Store options
 * @returns Store with API integration
 */
export function createApiStore<T, R = T>(
	initialData: T,
	options: {
		name?: string;
		transform?: (apiData: R) => T;
	} = {}
) {
	const { name = 'api-store', transform = (data: R) => data as unknown as T } = options;
	
	// Create the store
	const store = map({
		loading: false,
		error: null as string | null,
		data: initialData,
		lastUpdated: null as number | null
	});
	
	// Create helper functions
	const startLoading = () => {
		store.setKey('loading', true);
		store.setKey('error', null);
	};
	
	const setData = (data: R) => {
		try {
			const transformedData = transform(data);
			store.set({
				loading: false,
				error: null,
				data: transformedData,
				lastUpdated: Date.now()
			});
			debugLog(`${name}: Data updated successfully`);
		} catch (error) {
			debugError(`${name}: Error transforming data:`, error);
			store.set({
				loading: false,
				error: error instanceof Error ? error.message : 'Error transforming data',
				data: store.get().data,
				lastUpdated: store.get().lastUpdated
			});
		}
	};
	
	const setError = (error: unknown) => {
		store.set({
			loading: false,
			error: error instanceof Error ? error.message : String(error),
			data: store.get().data,
			lastUpdated: store.get().lastUpdated
		});
		debugError(`${name}: Error:`, error);
	};
	
	return {
		store,
		startLoading,
		setData,
		setError
	};
}

/**
 * Create a collection store for managing multiple items
 * 
 * @param initialItems - Initial items
 * @returns Collection store with helper methods
 */
export function createCollectionStore<T extends { id: string }>(initialItems: T[] = []) {
	// Create a map to store items by ID
	const itemsMap = new Map<string, T>();
	initialItems.forEach(item => itemsMap.set(item.id, item));
	
	// Create the store
	const store = atom<Map<string, T>>(itemsMap);
	
	// Helper to get all items as an array
	const getItems = (): T[] => {
		return Array.from(store.get().values());
	};
	
	// Helper to get a specific item
	const getItem = (id: string): T | undefined => {
		return store.get().get(id);
	};
	
	// Helper to add or update an item
	const upsertItem = (item: T): void => {
		const currentMap = new Map(store.get());
		currentMap.set(item.id, item);
		store.set(currentMap);
	};
	
	// Helper to add or update multiple items
	const upsertItems = (items: T[]): void => {
		const currentMap = new Map(store.get());
		items.forEach(item => currentMap.set(item.id, item));
		store.set(currentMap);
	};
	
	// Helper to remove an item
	const removeItem = (id: string): void => {
		const currentMap = new Map(store.get());
		currentMap.delete(id);
		store.set(currentMap);
	};
	
	// Helper to clear all items
	const clearItems = (): void => {
		store.set(new Map<string, T>());
	};
	
	return {
		store,
		getItems,
		getItem,
		upsertItem,
		upsertItems,
		removeItem,
		clearItems
	};
}
