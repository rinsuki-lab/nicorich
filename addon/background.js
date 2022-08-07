const tabIdToConnection = new Map()

function gone(tabId) {
    let conn = tabIdToConnection.get(tabId)
    if (conn != null) {
        conn.disconnect()
        console.info("disconnected by gone", tabId)
    }
    tabIdToConnection.delete(tabId)
}

browser.runtime.onMessage.addListener((message, sender) => {
    console.log(message)
    if (sender.tab == null) return
    const tabId = sender.tab.id
    console.log(message)
    if (message.type === "gone") {
        gone(tabId)
        return true
    } else if (message.type === "playing") {
        let conn = tabIdToConnection.get(tabId)
        if (conn == null) {
            conn = browser.runtime.connectNative("nicorich_native")
            conn.onDisconnect.addListener(e => {
                console.warn("disconnected", e)
                if (tabIdToConnection.get(tabId) === conn) {
                    tabIdToConnection.delete(tabId)
                }
            })
            tabIdToConnection.set(tabId, conn)
        }
        conn.postMessage(message)
        return true
    } else {
        console.warn("unknown message", message)
    }
})

browser.tabs.onRemoved.addListener(tabId => gone(tabId))