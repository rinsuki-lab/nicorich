const tabIdToConnection = new Map()
/** @type {{conn: any, timestamp: Date}[]} */
let disconnectQueue = []

setInterval(() => {
    if (disconnectQueue.length) {
        disconnectQueue = disconnectQueue.filter(queue => {
            if (queue.timestamp.getTime() < (Date.now() - 5000)) {
                queue.conn.disconnect()
                console.info("[nicorich] native connection was disconnected by queue", queue, Date.now())
                return false
            }
            return true
        })
    }
}, 1000)

function gone(tabId) {
    let conn = tabIdToConnection.get(tabId)
    if (conn != null) {
        disconnectQueue.push({
            conn,
            timestamp: new Date(),
        })
    }
    tabIdToConnection.delete(tabId)
}

browser.runtime.onMessage.addListener((message, sender) => {
    try {
        console.log(message)
        if (sender.tab == null) return
        const tabId = sender.tab.id
        if (message.type === "gone") {
            gone(tabId)
            return true
        } else if (message.type === "playing") {
            let conn = tabIdToConnection.get(tabId)
            if (conn == null) {
                const connFromQueue = disconnectQueue.shift()
                conn = connFromQueue?.conn
                if (conn == null) {
                    conn = browser.runtime.connectNative("nicorich_native")
                    console.info("[nicorich] craete native connection")
                } else {
                    console.info("[nicorich] reuse connection from disconnect queue")
                }
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
            console.warn("[nicorich] unknown message", message)
        }
    } catch(e) {
        console.error("[nicorich] error in message handler", e)
    }
})

browser.tabs.onRemoved.addListener(tabId => gone(tabId))