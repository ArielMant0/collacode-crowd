import { useApp } from "@/stores/app";
import { useLoader } from "./loader"

export async function loadLastUpdate() {
    const app = useApp()
    if (!app.ds) return
    const loader = useLoader()
    return loader.get(`lastupdate/dataset/${app.ds}`)
}

////////////////////////////////////////////////////////////
// Get Data
////////////////////////////////////////////////////////////

export async function loadItemsByCode(code) {
    const loader = useLoader();
    return loader.get(`items/code/${code}`)
}
export async function loadTagsByCode(code) {
    const loader = useLoader();
    return loader.get(`tags/code/${code}`)
}
export async function loadDataTagsByCode(code) {
    const loader = useLoader();
    return loader.get(`datatags/code/${code}`)
}

////////////////////////////////////////////////////////////
// Crowd Sourcing
////////////////////////////////////////////////////////////

function makeAuth() {
    const app = useApp()
    return {
        client: app.activeUserId,
        guid: app.guid,
        ip: app.ipAddress,
        source: app.userSrc,
        cwId: app.cwId,
    }
}

export async function loadCrowdMeta() {
    const loader = useLoader();
    return loader.get("crowd", makeAuth())
}

export async function loadCrowdItems() {
    const loader = useLoader();
    return loader.get("crowd/items", makeAuth())
}

export async function getClientStatus() {
    const loader = useLoader()
    return loader.get("crowd/client/status", makeAuth())
}

export async function setCrowdWorkerSubmitted() {
    const loader = useLoader()
    return loader.post("crowd/prolific/submitted", makeAuth())
}


// Comprehension Checks
export async function loadComprehensionData(itemId) {
    const loader = useLoader();
    return loader.get("crowd/comprehension", { itemId: itemId })
}
export async function testComprehensionData(itemId, answers, game) {
    const loader = useLoader();
    const obj = makeAuth()
    obj.gameId = game
    obj.itemId = itemId
    obj.answers = answers
    return loader.post("crowd/comprehension/test", obj)
}
// Attention Checks
export async function addAttentionFail(itemId, game) {
    const loader = useLoader();
    const obj = makeAuth()
    obj.gameId = game
    obj.itemId = itemId
    return loader.post("crowd/attention/fail", obj)
}

export async function addFeedback(text) {
    const loader = useLoader();
    const obj = makeAuth()
    obj.text = text
    return loader.post("crowd/feedback/add", obj)
}

export async function getClientRatings() {
    const app = useApp()
    if (!app.activeUserId) return []
    const loader = useLoader();
    return loader.get("crowd/ratings", makeAuth())
}

export async function getRatingStats() {
    const loader = useLoader();
    return loader.get("crowd/ratings/stats")
}

export async function addRatings(ratings) {
    const loader = useLoader();
    const obj = makeAuth()
    obj.ratings = ratings
    return loader.post("crowd/ratings/add", obj)
}

export async function addInteractionLog(action, data=null) {
    const loader = useLoader();
    const obj = makeAuth()
    if (!obj.client) return
    obj.rows = [{
        action: action,
        data: data ? ""+data : null,
        timestamp: Date.now()
    }]

    try {
        loader.post("crowd/interactions", obj)
    } catch(e) {
        console.error(e.toString())
    }
}

////////////////////////////////////////////////////////////
// Crowd Similarity Data
////////////////////////////////////////////////////////////

export async function getSimilarities(dataset=null) {
    const app = useApp()
    const loader = useLoader()
    return loader.get(`similarity/dataset/${dataset ? dataset : app.ds}`)
}

export async function getSimilarByTarget(target, limit=0) {
    const loader = useLoader();
    if (limit > 0) {
        return loader.get(`similarity/target/${target}/top/${limit}`)
    }
    return loader.get(`similarity/target/${target}`)
}

export async function addSimilarity(info, data) {
    const loader = useLoader();
    const obj = makeAuth()
    obj.info = info
    obj.rows = Array.isArray(data) ? data : [data]
    return loader.post("add/similarity", obj)
}