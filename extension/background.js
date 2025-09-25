// PCL Compressor Background Service Worker
console.log('PCL Compressor background service worker loaded')

// API Configuration
const CONFIG = {
  API_ENDPOINT: 'https://pcl-v2-hv2zqarnx-damians-projects-564804fc.vercel.app',
  API_KEY: 'w\'8V7V)_RX}TXLa'
}

// Install event
chrome.runtime.onInstalled.addListener(() => {
  console.log('PCL Compressor extension installed')

  // Create context menu
  chrome.contextMenus.create({
    id: 'pcl-compress',
    title: 'Compress with PCL',
    contexts: ['selection']
  })
})

// Context menu click handler
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === 'pcl-compress' && info.selectionText) {
    try {
      // Compress the selected text
      const result = await compressText(info.selectionText)

      // Send result to content script
      chrome.tabs.sendMessage(tab.id, {
        action: 'showCompressionResult',
        original: info.selectionText,
        result: result
      })
    } catch (error) {
      console.error('Compression failed:', error)
      chrome.tabs.sendMessage(tab.id, {
        action: 'showError',
        error: error.message
      })
    }
  }
})

// Message handler for communication with popup and content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Background received message:', message)

  if (message.action === 'compress') {
    compressText(message.text)
      .then(result => {
        sendResponse({ success: true, result })
      })
      .catch(error => {
        sendResponse({ success: false, error: error.message })
      })
    return true // Will respond asynchronously
  }

  if (message.action === 'submitFeedback') {
    submitFeedback(message.feedback)
      .then(() => {
        sendResponse({ success: true })
      })
      .catch(error => {
        sendResponse({ success: false, error: error.message })
      })
    return true
  }

  if (message.action === 'getSessionId') {
    getSessionId()
      .then(sessionId => {
        sendResponse({ sessionId })
      })
    return true
  }
})

// Compression function
async function compressText(text) {
  const sessionId = await getSessionId()

  const response = await fetch(`${CONFIG.API_ENDPOINT}/api/unified-compress`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': CONFIG.API_KEY
    },
    body: JSON.stringify({
      text: text,
      sessionId: sessionId
    })
  })

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`)
  }

  const result = await response.json()

  if (!result.success) {
    throw new Error(result.error || 'Compression failed')
  }

  return result.data
}

// Feedback submission function
async function submitFeedback(feedbackData) {
  const response = await fetch(`${CONFIG.API_ENDPOINT}/api/feedback`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': CONFIG.API_KEY
    },
    body: JSON.stringify(feedbackData)
  })

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`)
  }

  const result = await response.json()

  if (!result.success) {
    throw new Error(result.error || 'Feedback submission failed')
  }

  return result
}

// Session ID management
async function getSessionId() {
  const result = await chrome.storage.local.get(['sessionId'])

  if (result.sessionId) {
    return result.sessionId
  }

  // Generate new session ID
  const sessionId = 'ext_' + Date.now() + '_' + Math.random().toString(36).substring(2, 15)
  await chrome.storage.local.set({ sessionId })

  return sessionId
}

// Clear session on browser startup (optional)
chrome.runtime.onStartup.addListener(async () => {
  await chrome.storage.local.remove(['sessionId'])
  console.log('Session cleared on browser startup')
})

// Error handling for fetch failures
function handleApiError(error) {
  console.error('API Error:', error)

  if (error.message.includes('Failed to fetch')) {
    return 'Unable to connect to PCL server. Make sure the web app is running.'
  }

  if (error.message.includes('HTTP 503')) {
    return 'PCL server is temporarily unavailable. Please try again later.'
  }

  return error.message || 'Unknown error occurred'
}