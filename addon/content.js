function nicoTagNormalize(tag) {
    return tag.normalize("NFKC").toLowerCase().replace(/[ぁ-ん]/g, s => String.fromCharCode(s.charCodeAt(0) + 0x60)).normalize("NFKC").toLowerCase()
}

setTimeout(() => {
    /** @type {HTMLVideoElement} */
    const video = document.querySelector("#MainVideoPlayer > video")
    if (video == null) {
        console.warn("[nicorich] video not found")
    }
    let sendMessageTimer = undefined
    function gone(reason) {
        if (sendMessageTimer == null) {
            clearTimeout(sendMessageTimer)
            sendMessageTimer = null
        }
        console.info("[nicorich] gone, reason =", reason)
        browser.runtime.sendMessage({
            type: "gone"
        })
        lastMsgAt = 0
    }
    function update(reason) {
        console.info("[nicorich] update, reason =", reason)
        const ld = JSON.parse(Array.from(document.querySelectorAll(`script[type="application/ld+json"]`)).find(t => t.innerText.includes("VideoObject") && t.innerText.includes("keyword")).innerText)
        const normalizedTags = nicoTagNormalize(ld.keywords)
        const shouldHide = video.paused
                        || normalizedTags.includes(nicoTagNormalize("例のアレ"))
                        || normalizedTags.includes(nicoTagNormalize("R-18"))
                        || normalizedTags.includes(nicoTagNormalize("必須"))
        console.info("[nicorich] shouldHide =", shouldHide)
        if (shouldHide) {
            gone("update: " + reason)
        } else {
            let thumbnailUrl = null
            if (ld.thumbnailUrl[0]?.startsWith("https://img.cdn.nimg.jp/s/nicovideo/thumbnails/")) {
                // redirect to https://images.weserv.nl/?w=1280&h=1280&fit=contain&url=...
                // if we directly uses images.weserv.nl, it will not work (discord restricts about url length?)
                thumbnailUrl = ld.thumbnailUrl[0].replace("https://img.cdn.nimg.jp/s/nicovideo/thumbnails/", "https://nicothumbredir.deta.dev/v1/sqhd/icnj/")
            }

            const msg = JSON.stringify(["playing", ld.name, ld.url])
            const startedAt = Date.now() - Math.floor(video.currentTime*1000)
            if (sendMessageTimer != null) {
                console.info("[nicorich] overwrite queued update")
                clearTimeout(sendMessageTimer)
            }
            sendMessageTimer = setTimeout(() => {
                browser.runtime.sendMessage({
                    type: "playing",
                    title: ld.name,
                    url: ld.url,
                    thumbnailUrl,
                    startedAt,
                })
                console.info("[nicorich] send update")
                sendMessageTimer = null
            }, 1000)
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
