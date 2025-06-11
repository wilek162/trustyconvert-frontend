/**
 * Test file to verify MSW mock implementation for TrustyConvert API
 * Run this in the browser console to verify mocks are working
 */

import { initSession, uploadFile, convertFile, getJobStatus, getDownloadToken } from './apiClient'
import { v4 as uuidv4 } from 'uuid'

// Test all API endpoints
export async function testMockAPI() {
	console.log('🧪 Testing TrustyConvert API mocks...')

	try {
		// 1. Initialize session
		console.log('1️⃣ Testing session initialization...')
		const sessionResponse = await initSession()
		console.log('Session initialized:', sessionResponse)

		// 2. Upload file
		console.log('2️⃣ Testing file upload...')
		const jobId = uuidv4()
		const mockFile = new File(['test file content'], 'test-document.docx', {
			type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
		})

		const uploadResponse = await uploadFile(mockFile, jobId)
		console.log('File uploaded:', uploadResponse)

		// 3. Convert file
		console.log('3️⃣ Testing file conversion...')
		const convertResponse = await convertFile(jobId, 'pdf')
		console.log('Conversion started:', convertResponse)

		// 4. Check status
		console.log('4️⃣ Testing job status...')
		const statusResponse = await getJobStatus(jobId)
		console.log('Job status:', statusResponse)

		// Since our mock randomly completes jobs, we need to manually check if it's completed
		if (statusResponse.data.status === 'completed') {
			// 5. Get download token
			console.log('5️⃣ Testing download token...')
			const tokenResponse = await getDownloadToken(jobId)
			console.log('Download token:', tokenResponse)

			// 6. Download file (just log the URL)
			if (tokenResponse.data.download_token) {
				console.log('6️⃣ Download URL:', `/api/download?token=${tokenResponse.data.download_token}`)
			}
		} else {
			console.log('Job not completed yet, skipping download token test')
		}

		console.log('✅ All API tests completed successfully!')
		return true
	} catch (error) {
		console.error('❌ API test failed:', error)
		return false
	}
}

// Export for browser console testing
window.testTrustyConvertAPI = testMockAPI

export default { testMockAPI }
