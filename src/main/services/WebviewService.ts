import { session, shell, webContents } from 'electron'

// 存储自定义 User-Agent 的映射
const customUserAgents = new Map<string, string>()

/**
 * init the useragent of the webview session
 * remove the CherryStudio and Electron from the useragent
 */
export function initSessionUserAgent() {
  const wvSession = session.fromPartition('persist:webview')
  const originUA = wvSession.getUserAgent()
  const newUA = originUA.replace(/CherryStudio\/\S+\s/, '').replace(/Electron\/\S+\s/, '')

  wvSession.setUserAgent(newUA)
  wvSession.webRequest.onBeforeSendHeaders((details, cb) => {
    const headers = {
      ...details.requestHeaders,
      'User-Agent': details.url.includes('google.com') ? originUA : newUA
    }
    cb({ requestHeaders: headers })
  })
}

/**
 * 初始化主会话的 User-Agent 处理
 * 支持自定义 User-Agent 的动态设置
 */
export function initMainSessionUserAgent() {
  const mainSession = session.defaultSession
  
  mainSession.webRequest.onBeforeSendHeaders((details, cb) => {
    const headers = { ...details.requestHeaders }
    
    // 检查是否有为这个 URL 设置的自定义 User-Agent
    const customUA = getCustomUserAgentForUrl(details.url)
    if (customUA) {
      headers['User-Agent'] = customUA
    }
    
    cb({ requestHeaders: headers })
  })
}

/**
 * 为特定的 URL 模式设置自定义 User-Agent
 */
export function setCustomUserAgent(urlPattern: string, userAgent: string) {
  customUserAgents.set(urlPattern, userAgent)
}

/**
 * 移除特定 URL 模式的自定义 User-Agent
 */
export function removeCustomUserAgent(urlPattern: string) {
  customUserAgents.delete(urlPattern)
}

/**
 * 获取 URL 对应的自定义 User-Agent
 */
function getCustomUserAgentForUrl(url: string): string | null {
  for (const [pattern, userAgent] of customUserAgents.entries()) {
    if (url.includes(pattern)) {
      return userAgent
    }
  }
  return null
}

/**
 * WebviewService handles the behavior of links opened from webview elements
 * It controls whether links should be opened within the application or in an external browser
 */
export function setOpenLinkExternal(webviewId: number, isExternal: boolean) {
  const webview = webContents.fromId(webviewId)
  if (!webview) return

  webview.setWindowOpenHandler(({ url }) => {
    if (isExternal) {
      shell.openExternal(url)
      return { action: 'deny' }
    } else {
      return { action: 'allow' }
    }
  })
}
