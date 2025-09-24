# 🔧 PCL Chrome Extension Setup Guide

## Prerequisites

1. **PCL Web App Running**: Your Next.js app must be running at `http://localhost:3000`
2. **Database Setup**: Supabase database must be configured and seeded
3. **Chrome Browser**: Version 88+ (Manifest V3 support)

---

## Step 1: Prepare Extension Files

### 1.1 Verify Extension Structure
Your extension folder should contain:
```
extension/
├── manifest.json          ✅ Extension configuration
├── background.js          ✅ Service worker
├── content.js            ✅ Page interaction script
├── popup.html            ✅ Extension popup UI
├── popup.js              ✅ Popup functionality
├── tooltip.css           ✅ Tooltip styling
└── icons/                ✅ Extension icons
    ├── icon16.png
    ├── icon32.png
    ├── icon48.png
    └── icon128.png
```

### 1.2 Create Missing Icons (If Needed)
If icon files are missing, create simple placeholder icons:

**Option A: Use Online Generator**
1. Go to [favicon.io](https://favicon.io/favicon-generator/)
2. Enter "PCL" as text
3. Choose blue background (#3B82F6)
4. Download and rename files to icon16.png, icon32.png, etc.

**Option B: Simple Colored Squares**
1. Create 16x16, 32x32, 48x48, 128x128 pixel PNG files
2. Fill with blue background
3. Add white "PCL" text
4. Save in `extension/icons/` folder

---

## Step 2: Install Extension in Chrome

### 2.1 Enable Developer Mode
1. Open Chrome browser
2. Go to: `chrome://extensions/`
3. Toggle **Developer mode** (top-right corner) to **ON**

### 2.2 Load Unpacked Extension
1. Click **"Load unpacked"** button
2. Navigate to your `extension` folder:
   ```
   C:\Users\damia\Desktop\claude\PCL v2\extension
   ```
3. Select the folder and click **"Select Folder"**

### 2.3 Verify Installation
✅ You should see "PCL Compressor" in your extensions list
✅ Extension icon appears in Chrome toolbar
✅ No error messages in the extensions page

---

## Step 3: Configure Extension

### 3.1 Update API URL (If Needed)
If your PCL web app runs on a different URL:

1. Open `extension/background.js`
2. Find this line:
   ```javascript
   const API_BASE_URL = 'http://localhost:3000'
   ```
3. Change to your URL:
   ```javascript
   const API_BASE_URL = 'https://your-app.vercel.app'
   ```
4. Open `chrome://extensions/`
5. Click the **reload icon** on PCL Compressor

### 3.2 Verify Permissions
The extension needs these permissions:
- ✅ **activeTab**: Access current page content
- ✅ **storage**: Save session data
- ✅ **contextMenus**: Right-click compress option

---

## Step 4: Test Extension Features

### 4.1 Test Popup Interface
1. Click the PCL extension icon in toolbar
2. Popup should open with compression interface
3. Enter test text: `"Can you help me summarize this document please"`
4. Click **"Compress Text"**
5. Verify compressed result: `"Can u help me sum this doc pls"`

### 4.2 Test Text Selection Compression
1. Go to any webpage
2. Select some text (highlight it)
3. Look for blue **"🔧 Compress with PCL"** button
4. Click the button
5. Tooltip should appear with compressed result

### 4.3 Test Context Menu
1. Select text on any webpage
2. Right-click on selected text
3. Look for **"Compress with PCL"** option
4. Click it
5. Compressed result should appear in tooltip

### 4.4 Test Feedback System
1. After any compression
2. Click **👍 Good** or **👎 Bad** buttons
3. Verify feedback is submitted (check web app admin dashboard)

---

## Step 5: Troubleshooting

### 5.1 Extension Won't Load
**Problem**: Error when loading unpacked extension

**Solutions**:
```bash
# Check manifest.json syntax
# Open extension folder and verify all files exist
# Ensure no syntax errors in JavaScript files
```

### 5.2 API Connection Failed
**Problem**: "Unable to connect to PCL server"

**Solutions**:
1. ✅ Verify web app is running: `http://localhost:3000`
2. ✅ Check browser console for CORS errors
3. ✅ Update API_BASE_URL in background.js if needed
4. ✅ Reload extension after changes

### 5.3 Compression Not Working
**Problem**: Text selection doesn't show compress button

**Solutions**:
1. ✅ Check browser console for JavaScript errors
2. ✅ Verify content script is injected (check DevTools)
3. ✅ Ensure sufficient text is selected (3+ characters)
4. ✅ Reload the webpage

### 5.4 Popup Not Opening
**Problem**: Clicking extension icon does nothing

**Solutions**:
1. ✅ Check for popup.html syntax errors
2. ✅ Verify popup.js loads correctly
3. ✅ Check extension errors in chrome://extensions
4. ✅ Reload extension

---

## Step 6: Advanced Configuration

### 6.1 Custom Styling
To customize tooltip appearance:
1. Edit `extension/tooltip.css`
2. Reload extension
3. Test on any webpage

### 6.2 Change Keyboard Shortcuts
1. Go to `chrome://extensions/shortcuts`
2. Find "PCL Compressor"
3. Set custom keyboard shortcuts

### 6.3 Production Deployment
For production use:
1. Update `API_BASE_URL` to your deployed app
2. Test with production server
3. Package for Chrome Web Store (optional)

---

## Step 7: Usage Instructions

### Daily Workflow
1. **Quick Compression**: Click extension icon → paste text → compress
2. **Page Text**: Select text → click compress button → copy result
3. **Context Menu**: Right-click selected text → "Compress with PCL"

### Best Practices
- ✅ Select meaningful text chunks (sentences/phrases)
- ✅ Provide feedback to improve compression quality
- ✅ Use admin dashboard to monitor miss statistics
- ✅ Add compression rules for frequently missed patterns

---

## Step 8: Chrome Web Store Packaging (Optional)

### 8.1 Prepare for Store
```bash
# 1. Create extension package
cd extension
zip -r pcl-compressor.zip * -x "*.DS_Store" "*.git*"

# 2. Create store listing materials
# - High-quality icons (128x128, 440x280)
# - Screenshots of extension in action
# - Detailed description
# - Privacy policy
```

### 8.2 Store Submission
1. Go to [Chrome Developer Dashboard](https://chrome.google.com/webstore/devconsole)
2. Pay $5 registration fee (one-time)
3. Upload extension package
4. Fill out store listing
5. Submit for review (1-3 days)

---

## Quick Verification Checklist

After installation, verify:
- [ ] Extension appears in Chrome toolbar
- [ ] Popup opens when clicking icon
- [ ] Test compression works: "Can you help me..." → "Can u help me..."
- [ ] Text selection shows compress button
- [ ] Right-click context menu has PCL option
- [ ] Tooltip appears with compression results
- [ ] Copy button works in tooltip
- [ ] Feedback buttons submit successfully
- [ ] No errors in browser console
- [ ] Admin dashboard shows compression activity

---

## Support & Debugging

### Extension Console Logs
1. Go to `chrome://extensions/`
2. Click "Inspect views: service worker" under PCL Compressor
3. Check console for error messages

### Content Script Debugging
1. Open any webpage
2. Press F12 (Developer Tools)
3. Check Console tab for PCL-related messages

### Network Debugging
1. Open Developer Tools (F12)
2. Go to Network tab
3. Perform compression
4. Check API requests to localhost:3000

---

## Security Notes

- ✅ Extension only accesses text you explicitly select
- ✅ No personal data is collected or stored
- ✅ API communication uses HTTPS in production
- ✅ Session IDs are anonymous and temporary
- ✅ Feedback is voluntary and anonymous

The PCL Chrome extension is now ready for use! 🚀