function nicoTagNormalize(tag) {
    return tag.normalize("NFKC").toLowerCase().replace(/[ぁ-ん]/g, s => String.fromCharCode(s.charCodeAt(0) + 0x60)).normalize("NFKC").toLowerCase()
}

setTimeout(() => {
    /** @type {HTMLVideoElement} */
    const video = document.querySelector("#MainVideoPlayer > video")
    if (video == null) {
        console.warn("[nicorich] video not found")
    }
    let lastMsg = "", lastMsgAt = 0
    function gone(reason) {
        console.info("[nicorich] gone, reason =", reason)
        browser.runtime.sendMessage({
            type: "gone"
        })
        lastMsgAt = 0
    }
    function update(reason) {
        console.info("[nicorich] update, reason =", reason)
        const ld = JSON.parse(Array.from(document.querySelectorAll(`script[type="application/ld+json"]`)).at(-1))
        const normalizedTags = nicoTagNormalize(ld.keywords)
        const shouldHide = video.paused
                        || normalizedTags.includes(nicoTagNormalize("例のアレ"))
                        || normalizedTags.includes(nicoTagNormalize("R-18"))
                        || normalizedTags.includes(nicoTagNormalize("必須"))
        console.info("[nicorich] shouldHide =", shouldHide)
        if (shouldHide) {
            gone("update: " + reason)
        } else {
            const msg = JSON.stringify(["playing", ld.name, ld.url])
            const startedAt = Date.now() - Math.floor(video.currentTime*1000)
            if (msg !== lastMsg || Math.abs(lastMsgAt - startedAt) > 5000) {
                lastMsg = msg
                lastMsgAt = startedAt
                browser.runtime.sendMessage({
                    type: "playing",
                    title: ld.name,
                    url: ld.url,
                    startedAt,
                })
                console.info("[nicorich] send update")
            } else {
                console.info("[nicorich] skip update", Math.abs(lastMsgAt - startedAt))
            }
        }
    }
    video.addEventListener("play", e => update("ev: play"))
    video.addEventListener("playing", e => update("ev: playing"))
    video.addEventListener("seeked", e => update("ev: seeked"))
    video.addEventListener("pause", e => gone("ev: pause"))
    video.addEventListener("ended", e => gone("ev: ended"))
    addEventListener("unload", () => gone("ev: unload"))
    if (video.paused) {
        gone("init")
    } else {
        update("init")
    }
    console.info("[nicorich] hooked!", video)
}, 1000)
