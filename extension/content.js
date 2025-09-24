// PCL Compressor Content Script
console.log('PCL Compressor content script loaded')

// Inject tooltip styles
injectTooltipStyles()

// Message listener from background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Content script received message:', message)

  if (message.action === 'showCompressionResult') {
    showCompressionTooltip(message.original, message.result)
  }

  if (message.action === 'showError') {
    showErrorTooltip(message.error)
  }
})

// Add PCL button to text selections
document.addEventListener('mouseup', handleTextSelection)
document.addEventListener('keyup', handleTextSelection)

function handleTextSelection() {
  const selection = window.getSelection()
  const selectedText = selection.toString().trim()

  // Remove existing PCL button
  removeExistingButton()

  if (selectedText && selectedText.length > 0) {
    // Show PCL compress button near selection
    showCompressButton(selection, selectedText)
  }
}

function showCompressButton(selection, text) {
  const range = selection.getRangeAt(0)
  const rect = range.getBoundingClientRect()

  const button = document.createElement('div')
  button.id = 'pcl-compress-button'
  button.innerHTML = `
    <div style="
      position: fixed;
      top: ${rect.bottom + window.scrollY + 5}px;
      left: ${rect.left + window.scrollX}px;
      background: #3B82F6;
      color: white;
      padding: 6px 12px;
      border-radius: 6px;
      font-size: 12px;
      font-family: system-ui, sans-serif;
      cursor: pointer;
      box-shadow: 0 2px 8px rgba(0,0,0,0.15);
      z-index: 10000;
      user-select: none;
      transition: all 0.2s ease;
    " onmouseover="this.style.background='#2563EB'" onmouseout="this.style.background='#3B82F6'">
      🔧 Compress with PCL
    </div>
  `

  button.addEventListener('click', () => {
    compressSelectedText(text)
    removeExistingButton()
  })

  document.body.appendChild(button)

  // Auto-remove button after 5 seconds
  setTimeout(() => {
    removeExistingButton()
  }, 5000)
}

function removeExistingButton() {
  const existingButton = document.getElementById('pcl-compress-button')
  if (existingButton) {
    existingButton.remove()
  }
}

function compressSelectedText(text) {
  console.log('Compressing text:', text)

  // Show loading state
  showLoadingTooltip()

  // Send compression request to background script
  chrome.runtime.sendMessage({
    action: 'compress',
    text: text
  }, (response) => {
    hideLoadingTooltip()

    if (response && response.success) {
      showCompressionTooltip(text, response.result)
    } else {
      showErrorTooltip(response?.error || 'Compression failed')
    }
  })
}

function showCompressionTooltip(originalText, result) {
  // Remove existing tooltips
  removeExistingTooltips()

  const tooltip = document.createElement('div')
  tooltip.id = 'pcl-compression-tooltip'
  tooltip.innerHTML = `
    <div class="pcl-tooltip">
      <div class="pcl-tooltip-header">
        <span class="pcl-tooltip-title">✨ PCL Compressed</span>
        <button class="pcl-tooltip-close" onclick="this.closest('#pcl-compression-tooltip').remove()">×</button>
      </div>

      <div class="pcl-tooltip-content">
        <div class="pcl-compressed-text">${result.compressed}</div>

        <div class="pcl-stats">
          <div class="pcl-stat">
            <span class="pcl-stat-value">${result.compressionRatio}%</span>
            <span class="pcl-stat-label">Saved</span>
          </div>
          <div class="pcl-stat">
            <span class="pcl-stat-value">${result.processingTime}ms</span>
            <span class="pcl-stat-label">Time</span>
          </div>
          <div class="pcl-stat">
            <span class="pcl-stat-value">${result.rulesApplied.length}</span>
            <span class="pcl-stat-label">Rules</span>
          </div>
        </div>

        <div class="pcl-actions">
          <button class="pcl-btn pcl-btn-primary" onclick="copyToClipboard('${result.compressed.replace(/'/g, "\\'")}')">
            📋 Copy
          </button>
          <button class="pcl-btn pcl-btn-success" onclick="submitFeedback(true, '${originalText.replace(/'/g, "\\'")}', '${result.compressed.replace(/'/g, "\\'")}', ${JSON.stringify(result.rulesApplied).replace(/'/g, "\\'")})">
            👍 Good
          </button>
          <button class="pcl-btn pcl-btn-danger" onclick="submitFeedback(false, '${originalText.replace(/'/g, "\\'")}', '${result.compressed.replace(/'/g, "\\'")}', ${JSON.stringify(result.rulesApplied).replace(/'/g, "\\'")})">
            👎 Bad
          </button>
        </div>
      </div>
    </div>
  `

  document.body.appendChild(tooltip)

  // Position tooltip in viewport
  positionTooltip(tooltip)

  // Auto-remove after 15 seconds
  setTimeout(() => {
    if (tooltip.parentNode) {
      tooltip.remove()
    }
  }, 15000)
}

function showErrorTooltip(error) {
  removeExistingTooltips()

  const tooltip = document.createElement('div')
  tooltip.id = 'pcl-error-tooltip'
  tooltip.innerHTML = `
    <div class="pcl-tooltip pcl-tooltip-error">
      <div class="pcl-tooltip-header">
        <span class="pcl-tooltip-title">❌ Compression Failed</span>
        <button class="pcl-tooltip-close" onclick="this.closest('#pcl-error-tooltip').remove()">×</button>
      </div>
      <div class="pcl-tooltip-content">
        <div class="pcl-error-message">${error}</div>
      </div>
    </div>
  `

  document.body.appendChild(tooltip)
  positionTooltip(tooltip)

  setTimeout(() => {
    if (tooltip.parentNode) {
      tooltip.remove()
    }
  }, 8000)
}

function showLoadingTooltip() {
  removeExistingTooltips()

  const tooltip = document.createElement('div')
  tooltip.id = 'pcl-loading-tooltip'
  tooltip.innerHTML = `
    <div class="pcl-tooltip">
      <div class="pcl-tooltip-content">
        <div class="pcl-loading">
          <div class="pcl-spinner"></div>
          <span>Compressing text...</span>
        </div>
      </div>
    </div>
  `

  document.body.appendChild(tooltip)
  positionTooltip(tooltip)
}

function hideLoadingTooltip() {
  const loadingTooltip = document.getElementById('pcl-loading-tooltip')
  if (loadingTooltip) {
    loadingTooltip.remove()
  }
}

function removeExistingTooltips() {
  const tooltips = document.querySelectorAll('[id*="pcl-"][id*="tooltip"]')
  tooltips.forEach(tooltip => tooltip.remove())
}

function positionTooltip(tooltip) {
  const rect = tooltip.getBoundingClientRect()
  const viewportWidth = window.innerWidth
  const viewportHeight = window.innerHeight

  // Default position: center of viewport
  let top = (viewportHeight - rect.height) / 2
  let left = (viewportWidth - rect.width) / 2

  // Keep within viewport bounds
  top = Math.max(20, Math.min(top, viewportHeight - rect.height - 20))
  left = Math.max(20, Math.min(left, viewportWidth - rect.width - 20))

  tooltip.style.position = 'fixed'
  tooltip.style.top = top + 'px'
  tooltip.style.left = left + 'px'
  tooltip.style.zIndex = '10001'
}

// Global functions for tooltip buttons
window.copyToClipboard = async function(text) {
  try {
    await navigator.clipboard.writeText(text)

    // Show brief success message
    const button = event.target
    const originalText = button.textContent
    button.textContent = '✅ Copied!'
    button.style.background = '#10B981'

    setTimeout(() => {
      button.textContent = originalText
      button.style.background = ''
    }, 2000)
  } catch (err) {
    console.error('Failed to copy:', err)
  }
}

window.submitFeedback = function(satisfied, originalText, compressedText, rulesApplied) {
  chrome.runtime.sendMessage({
    action: 'submitFeedback',
    feedback: {
      satisfied,
      originalText,
      compressedText,
      rulesApplied
    }
  }, (response) => {
    if (response && response.success) {
      // Show feedback success
      const button = event.target
      const originalText = button.textContent
      button.textContent = satisfied ? '✅ Thanks!' : '📝 Noted!'
      button.disabled = true

      setTimeout(() => {
        const tooltip = button.closest('[id*="tooltip"]')
        if (tooltip) tooltip.remove()
      }, 2000)
    }
  })
}

function injectTooltipStyles() {
  const link = document.createElement('link')
  link.rel = 'stylesheet'
  link.href = chrome.runtime.getURL('tooltip.css')
  document.head.appendChild(link)
}