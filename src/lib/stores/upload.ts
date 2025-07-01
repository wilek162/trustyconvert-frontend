import { atom } from 'nanostores'
import { openDB } from 'idb'
import type { IDBPDatabase } from 'idb'

// Job status type
export type JobStatus = 'idle' | 'uploading' | 'uploaded' | 'processing' | 'completed' | 'failed'

// File upload data interface
export interface FileUploadData {
	jobId: string
	originalFilename: string
	targetFormat: string
	status: JobStatus
	uploadProgress: number
	fileSize: number
	mimeType: string
	errorMessage?: string
	downloadToken?: string
	completedAt?: string
	createdAt: string
}

// Upload state interface
export interface UploadState {
	files: Map<string, FileUploadData>
	activeUploads: string[]
	conversionQueue: string[]
	completedJobs: string[]
}

// Initial upload state
const initialUploadState: UploadState = {
	files: new Map<string, FileUploadData>(),
	activeUploads: [],
	conversionQueue: [],
	completedJobs: []
}

// Create the upload store
export const uploadStore = atom<UploadState>(initialUploadState)

// IndexedDB database name and version
const DB_NAME = 'trustyconvert-db'
const DB_VERSION = 1
const JOB_STORE = 'jobs'

// Database connection
let db: IDBPDatabase | null = null

// Initialize IndexedDB
export async function initIndexedDB(): Promise<void> {
	try {
		db = await openDB(DB_NAME, DB_VERSION, {
			upgrade(database) {
				// Create jobs store
				if (!database.objectStoreNames.contains(JOB_STORE)) {
					const jobStore = database.createObjectStore(JOB_STORE, { keyPath: 'jobId' })
					jobStore.createIndex('status', 'status')
					jobStore.createIndex('createdAt', 'createdAt')
				}
			}
		})

		// Load jobs from IndexedDB
		await loadJobsFromIndexedDB()
	} catch (error) {
		console.error('Failed to initialize IndexedDB:', error)
	}
}

// Load jobs from IndexedDB
async function loadJobsFromIndexedDB(): Promise<void> {
	if (!db) return

	try {
		const jobs = await db.getAll(JOB_STORE)
		const filesMap = new Map<string, FileUploadData>()
		const activeUploads: string[] = []
		const conversionQueue: string[] = []
		const completedJobs: string[] = []

		jobs.forEach((job) => {
			filesMap.set(job.jobId, job)

			// Categorize jobs
			if (job.status === 'uploading') {
				activeUploads.push(job.jobId)
			} else if (job.status === 'processing' || job.status === 'uploaded') {
				conversionQueue.push(job.jobId)
			} else if (job.status === 'completed') {
				completedJobs.push(job.jobId)
			}
		})

		// Update store with loaded data
		uploadStore.set({
			files: filesMap,
			activeUploads,
			conversionQueue,
			completedJobs
		})
	} catch (error) {
		console.error('Failed to load jobs from IndexedDB:', error)
	}
}

// Save job to IndexedDB
async function saveJobToIndexedDB(job: FileUploadData): Promise<void> {
	if (!db) return

	try {
		await db.put(JOB_STORE, job)
	} catch (error) {
		console.error('Failed to save job to IndexedDB:', error)
	}
}

// Delete job from IndexedDB
async function deleteJobFromIndexedDB(jobId: string): Promise<void> {
	if (!db) return

	try {
		await db.delete(JOB_STORE, jobId)
	} catch (error) {
		console.error('Failed to delete job from IndexedDB:', error)
	}
}

// Add a new job
export async function addJob(job: FileUploadData): Promise<void> {
	const currentState = uploadStore.get()

	// Update store
	currentState.files.set(job.jobId, job)

	if (job.status === 'uploading') {
		currentState.activeUploads.push(job.jobId)
	}

	uploadStore.set({ ...currentState })

	// Save to IndexedDB
	await saveJobToIndexedDB(job)
}

// Update job status
export async function updateJobStatus(
	jobId: string,
	status: JobStatus,
	data?: Partial<FileUploadData>
): Promise<void> {
	const currentState = uploadStore.get()
	const job = currentState.files.get(jobId)

	if (!job) return

	// Update job data
	const updatedJob: FileUploadData = {
		...job,
		status,
		...data
	}

	// Update job in files map
	currentState.files.set(jobId, updatedJob)

	// Update job categories
	const { activeUploads, conversionQueue, completedJobs } = currentState

	// Remove from all categories first
	const removeFromArray = (arr: string[], id: string) => {
		const index = arr.indexOf(id)
		if (index !== -1) {
			arr.splice(index, 1)
		}
	}

	removeFromArray(activeUploads, jobId)
	removeFromArray(conversionQueue, jobId)
	removeFromArray(completedJobs, jobId)

	// Add to appropriate category
	if (status === 'uploading') {
		activeUploads.push(jobId)
	} else if (status === 'uploaded' || status === 'processing') {
		conversionQueue.push(jobId)
	} else if (status === 'completed') {
		completedJobs.push(jobId)
	}

	// Update store
	uploadStore.set({
		files: currentState.files,
		activeUploads,
		conversionQueue,
		completedJobs
	})

	// Save to IndexedDB
	await saveJobToIndexedDB(updatedJob)
}

// Update job upload progress
export async function updateJobProgress(jobId: string, progress: number): Promise<void> {
	const currentState = uploadStore.get()
	const job = currentState.files.get(jobId)

	if (!job) return

	// Update job
	const updatedJob: FileUploadData = {
		...job,
		uploadProgress: progress
	}

	// Update store
	currentState.files.set(jobId, updatedJob)
	uploadStore.set({ ...currentState })

	// Save to IndexedDB
	await saveJobToIndexedDB(updatedJob)
}

// Set download token for job
export async function setJobDownloadToken(jobId: string, downloadToken: string): Promise<void> {
	const currentState = uploadStore.get()
	const job = currentState.files.get(jobId)

	if (!job) return

	// Update job
	const updatedJob: FileUploadData = {
		...job,
		downloadToken
	}

	// Update store
	currentState.files.set(jobId, updatedJob)
	uploadStore.set({ ...currentState })

	// Save to IndexedDB
	await saveJobToIndexedDB(updatedJob)
}

// Remove job
export async function removeJob(jobId: string): Promise<void> {
	const currentState = uploadStore.get()

	// Remove from files map
	currentState.files.delete(jobId)

	// Remove from categories
	const removeFromArray = (arr: string[], id: string) => {
		const index = arr.indexOf(id)
		if (index !== -1) {
			arr.splice(index, 1)
		}
	}

	removeFromArray(currentState.activeUploads, jobId)
	removeFromArray(currentState.conversionQueue, jobId)
	removeFromArray(currentState.completedJobs, jobId)

	// Update store
	uploadStore.set({ ...currentState })

	// Delete from IndexedDB
	await deleteJobFromIndexedDB(jobId)
}

// Clear all completed jobs
export async function clearCompletedJobs(): Promise<void> {
	const currentState = uploadStore.get()
	const { completedJobs, files } = currentState

	// Delete each completed job
	for (const jobId of completedJobs) {
		files.delete(jobId)
		await deleteJobFromIndexedDB(jobId)
	}

	// Update store
	uploadStore.set({
		files,
		activeUploads: currentState.activeUploads,
		conversionQueue: currentState.conversionQueue,
		completedJobs: []
	})
}

// Get job by ID
export function getJob(jobId: string): FileUploadData | undefined {
	return uploadStore.get().files.get(jobId)
}

// Get all jobs
export function getAllJobs(): FileUploadData[] {
	return Array.from(uploadStore.get().files.values())
}

// Get active uploads
export function getActiveUploads(): FileUploadData[] {
	const { files, activeUploads } = uploadStore.get()
	return activeUploads.map((jobId) => files.get(jobId)!).filter(Boolean)
}

// Get conversion queue
export function getConversionQueue(): FileUploadData[] {
	const { files, conversionQueue } = uploadStore.get()
	return conversionQueue.map((jobId) => files.get(jobId)!).filter(Boolean)
}

// Get completed jobs
export function getCompletedJobs(): FileUploadData[] {
	const { files, completedJobs } = uploadStore.get()
	return completedJobs.map((jobId) => files.get(jobId)!).filter(Boolean)
}

// Update job with partial data
export async function updateJob(jobId: string, data: Partial<FileUploadData>): Promise<void> {
	const currentState = uploadStore.get()
	const job = currentState.files.get(jobId)

	if (!job) return

	// Update job data
	const updatedJob: FileUploadData = {
		...job,
		...data
	}

	// Update job in files map
	currentState.files.set(jobId, updatedJob)

	// Update store
	uploadStore.set({
		...currentState,
		files: new Map(currentState.files)
	})

	// Save to IndexedDB
	await saveJobToIndexedDB(updatedJob)
}

// Initialize IndexedDB when module is imported
if (typeof window !== 'undefined') {
	initIndexedDB()
}
