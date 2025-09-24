// PCL Compressor Popup Script
console.log('PCL Popup loaded')

// DOM elements
const inputText = document.getElementById('inputText')
const charCount = document.getElementById('charCount')
const compressBtn = document.getElementById('compressBtn')
const btnText = document.getElementById('btnText')
const btnSpinner = document.getElementById('btnSpinner')
const errorSection = document.getElementById('errorSection')
const errorText = document.getElementById('errorText')
const resultSection = document.getElementById('resultSection')
const compressedText = document.getElementById('compressedText')
const compressionRatio = document.getElementById('compressionRatio')
const processingTime = document.getElementById('processingTime')
const rulesApplied = document.getElementById('rulesApplied')
const copyBtn = document.getElementById('copyBtn')
const positiveBtn = document.getElementById('positiveBtn')
const negativeBtn = document.getElementById('negativeBtn')
const feedbackSection = document.getElementById('feedbackSection')

// State
let currentResult = null
let feedbackGiven = false

// Event listeners
inputText.addEventListener('input', updateCharCount)
compressBtn.addEventListener('click', compressText)
copyBtn.addEventListener('click', copyToClipboard)
positiveBtn.addEventListener('click', () => submitFeedback(true))
negativeBtn.addEventListener('click', () => submitFeedback(false))

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  updateCharCount()
  loadSample() // Load sample text by default
})

function updateCharCount() {
  const count = inputText.value.length
  charCount.textContent = count

  // Update compress button state
  compressBtn.disabled = count === 0
}

function compressText() {
  const text = inputText.value.trim()

  if (!text) {
    showError('Please enter some text to compress')
    return
  }

  // Reset state
  hideError()
  hideResult()
  setLoading(true)
  feedbackGiven = false

  // Send compression request to background script
  chrome.runtime.sendMessage({
    action: 'compress',
    text: text
  }, (response) => {
    setLoading(false)

    if (response && response.success) {
      showResult(response.result, text)
    } else {
      showError(response?.error || 'Compression failed. Make sure PCL server is running.')
    }
  })
}

function setLoading(loading) {
  compressBtn.disabled = loading

  if (loading) {
    btnText.style.display = 'none'
    btnSpinner.style.display = 'block'
  } else {
    btnText.style.display = 'block'
    btnSpinner.style.display = 'none'
  }
}

function showResult(result, originalText) {
  currentResult = { ...result, originalText }

  // Update result display
  compressedText.textContent = result.compressed
  compressionRatio.textContent = `${result.compressionRatio}%`
  processingTime.textContent = `${result.processingTime}ms`
  rulesApplied.textContent = result.rulesApplied.length

  // Show result section
  resultSection.classList.add('show')

  // Reset feedback buttons
  resetFeedbackButtons()
}

function hideResult() {
  resultSection.classList.remove('show')
  currentResult = null
}

function showError(message) {
  errorText.textContent = message
  errorSection.classList.add('show')
}

function hideError() {
  errorSection.classList.remove('show')
}

async function copyToClipboard() {
  if (!currentResult) return

  try {
    await navigator.clipboard.writeText(currentResult.compressed)

    // Show success feedback
    const originalText = copyBtn.textContent
    copyBtn.textContent = '✅ Copied!'
    copyBtn.style.background = '#10B981'

    setTimeout(() => {
      copyBtn.textContent = originalText
      copyBtn.style.background = ''
    }, 2000)
  } catch (err) {
    console.error('Failed to copy:', err)
    showError('Failed to copy to clipboard')
  }
}

function submitFeedback(satisfied) {
  if (!currentResult || feedbackGiven) return

  const feedbackData = {
    satisfied,
    originalText: currentResult.originalText,
    compressedText: currentResult.compressed,
    rulesApplied: currentResult.rulesApplied,
    compressionRatio: currentResult.compressionRatio,
    processingTime: currentResult.processingTime
  }

  chrome.runtime.sendMessage({
    action: 'submitFeedback',
    feedback: feedbackData
  }, (response) => {
    if (response && response.success) {
      feedbackGiven = true

      // Update button states
      const clickedBtn = satisfied ? positiveBtn : negativeBtn
      const otherBtn = satisfied ? negativeBtn : positiveBtn

      clickedBtn.textContent = satisfied ? '✅ Thanks!' : '📝 Noted!'
      clickedBtn.disabled = true
      otherBtn.disabled = true

      setTimeout(() => {
        feedbackSection.style.opacity = '0.5'
      }, 1000)
    } else {
      showError('Failed to submit feedback')
    }
  })
}

function resetFeedbackButtons() {
  positiveBtn.textContent = '👍 Good'
  negativeBtn.textContent = '👎 Bad'
  positiveBtn.disabled = false
  negativeBtn.disabled = false
  feedbackSection.style.opacity = '1'
}

// Quick action functions
function loadSample() {
  inputText.value = 'Can you help me summarize this document please'
  updateCharCount()
  hideError()
  hideResult()
}

async function pasteFromClipboard() {
  try {
    const text = await navigator.clipboard.readText()
    if (text) {
      inputText.value = text.substring(0, 2000) // Respect max length
      updateCharCount()
      hideError()
      hideResult()
    }
  } catch (err) {
    console.error('Failed to paste:', err)
    showError('Failed to access clipboard')
  }
}

function clearText() {
  inputText.value = ''
  updateCharCount()
  hideError()
  hideResult()
}

// Handle extension installation/update
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'compressionComplete') {
    setLoading(false)
    showResult(message.result, message.originalText)
  }

  if (message.action === 'compressionError') {
    setLoading(false)
    showError(message.error)
  }
})

// Auto-focus text area when popup opens
inputText.focus()