const { app, BrowserWindow, ipcMain } = require('electron/main')
const path = require('path')

app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required')

const createWindow = () => {
  const win = new BrowserWindow({
    width: 1100,
    height: 860,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    }
  })
  win.loadFile('index.html')
}

// ── AI Generate via OpenAI ─────────────────────────────────────────
ipcMain.handle('ai-generate', async (_event, { apiKey, mode, userText, persona }) => {
  const modePrompts = {
    story: `Write a vivid, dramatic short story (4 paragraphs) about: "${userText}". Make it immersive and emotional.`,
    news: `Write a professional TV news broadcast script (2 minutes) about: "${userText}". Use formal anchor language with intro, body, and sign-off.`,
    song: `Write complete song lyrics about: "${userText}". Include intro, two verses, a chorus, a bridge, and outro. Add [Verse], [Chorus], [Bridge] labels.`,
    emotional: `Rewrite the following text with intense emotional depth and vivid feeling: "${userText}"`,
    mimic: `Rewrite the following text in the voice and style of ${persona || 'Morgan Freeman'}, capturing their exact tone, pacing and mannerisms: "${userText}"`,
    poem: `Write a beautiful, expressive poem about: "${userText}". Use rich imagery and metaphor.`,
    comedy: `Write a funny stand-up comedy bit about: "${userText}". Include punchlines and crowd reactions like [laugh].`,
    horror: `Write a chilling horror narration about: "${userText}". Make it suspenseful and terrifying.`,
  }
  const prompt = modePrompts[mode] || modePrompts.story
  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 700,
      }),
    })
    const data = await res.json()
    if (data.error) return { error: data.error.message }
    return { text: data.choices[0].message.content.trim() }
  } catch (e) {
    return { error: e.message }
  }
})

app.whenReady().then(() => {
  ipcMain.handle('ping', () => 'pong')
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
