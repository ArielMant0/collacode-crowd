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

export async function loadCrowdMeta() {
    const app = useApp()
    const loader = useLoader();
    return loader.get("crowd", {
        client: app.activeUserId,
        guid: app.guid,
        ip: app.ipAddress,
        cwId: app.cwId,
        cwSource: app.cwSource
    })
}

export async function loadCrowdItems() {
    const app = useApp()
    const loader = useLoader();
    return loader.get("crowd/items", {
        client: app.activeUserId,
        guid: app.guid,
        ip: app.ipAddress,
        cwId: app.cwId
    })
}

export async function getClientStatus() {
    const app = useApp()
    const loader = useLoader()
    return loader.get("similarity/status", {
        client: app.activeUserId,
        guid: app.guid,
        ip: app.ipAddress,
        cwId: app.cwId,
    })
}

// Comprehension Checks
export async function loadComprehensionData(itemId) {
    const loader = useLoader();
    return loader.get("crowd/comprehension", { itemId: itemId })
}
export async function testComprehensionData(itemId, answers, game) {
    const app = useApp()
    const loader = useLoader();
    return loader.post("crowd/comprehension/test", {
        client: app.activeUserId,
        guid: app.guid,
        ip: app.ipAddress,
        cwId: app.cwId,
        gameId: game,
        // actual data
        itemId: itemId,
        answers: answers,
    })
}
// Attention Checks
export async function addAttentionFail(itemId, game) {
    const app = useApp()
    const loader = useLoader();
    return loader.post("crowd/attention/fail", {
        client: app.activeUserId,
        guid: app.guid,
        ip: app.ipAddress,
        cwId: app.cwId,
        gameId: game,
        itemId: itemId
    })
}

export async function addFeedback(text) {
    const app = useApp()
    const loader = useLoader();
    return loader.post("feedback", {
        client: app.activeUserId,
        guid: app.guid,
        ip: app.ipAddress,
        cwId: app.cwId,
        text: text,
    })
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
    const app = useApp()
    const loader = useLoader();
    return loader.post("add/similarity", {
        // client data
        client: app.activeUserId,
        guid: app.guid,
        ip: app.ipAddress,
        cwId: app.cwId,
        // data
        info: info,
        rows: Array.isArray(data) ? data : [data]
    })
}