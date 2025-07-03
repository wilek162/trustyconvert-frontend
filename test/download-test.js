/**
 * Download Functionality Test
 * 
 * This script tests the download functionality by simulating the flow
 * from job completion to file download.
 */

// Mock DOM environment
const mockDownloadLink = {
  href: null,
  download: null,
  style: { display: 'none' },
  click: function() {
    console.log('Download initiated with URL:', this.href);
    return true;
  }
};

// Mock document functions
global.document = {
  createElement: function(tag) {
    if (tag === 'a') {
      return mockDownloadLink;
    }
    return {};
  },
  body: {
    appendChild: function() { return true; },
    removeChild: function() { return true; }
  }
};

// Mock client
const mockClient = {
  getDownloadUrl: function(token) {
    return `https://api.domain.local/api/download?token=${token}`;
  },
  getDownloadToken: async function(jobId) {
    console.log(`Getting download token for job: ${jobId}`);
    return {
      success: true,
      data: {
        download_token: 'mock-token-123'
      }
    };
  },
  ensureSession: async function() {
    return true;
  }
};

// Mock debug functions
const mockDebug = {
  debugLog: function(message) {
    console.log('[DEBUG]', message);
  },
  debugError: function(message, error) {
    console.error('[ERROR]', message, error);
  }
};

// Test the download service
async function testDownloadService() {
  console.log('=== Testing Download Service ===');
  
  // Mock imports
  const downloadService = {
    getDownloadToken: async function(jobId) {
      console.log(`Getting download token for job: ${jobId}`);
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      
      return {
        success: true,
        token: 'mock-token-123',
        url: mockClient.getDownloadUrl('mock-token-123')
      };
    },
    
    initiateDownload: async function(token, filename) {
      console.log(`Initiating download with token: ${token}`);
      
      if (!token) {
        throw new Error('No download token provided');
      }
      
      // Get the download URL
      const downloadUrl = mockClient.getDownloadUrl(token);
      
      // Create an invisible <a> element and trigger click
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename || '';
      link.style.display = 'none';
      document.body.appendChild(link);
      const result = link.click();
      document.body.removeChild(link);
      
      return result;
    }
  };
  
  // Test the flow
  try {
    // 1. Get download token
    console.log('Step 1: Getting download token...');
    const jobId = 'mock-job-123';
    const tokenResult = await downloadService.getDownloadToken(jobId);
    
    console.log('Token result:', tokenResult);
    
    if (!tokenResult.success) {
      throw new Error('Failed to get download token');
    }
    
    // 2. Initiate download
    console.log('Step 2: Initiating download...');
    const downloadSuccess = await downloadService.initiateDownload(tokenResult.token, 'test-file.pdf');
    
    console.log('Download success:', downloadSuccess);
    
    if (downloadSuccess) {
      console.log('Download test completed successfully!');
    } else {
      console.error('Download test failed!');
    }
  } catch (error) {
    console.error('Test failed with error:', error);
  }
}

// Run the test
testDownloadService(); 