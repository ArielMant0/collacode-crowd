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
    const loader = useLoader();
    const app = useApp()
    return loader.get("crowd", {
        guid: app.activeUserId,
        ip: app.ipAddress,
        cwId: app.cwId,
        cwSource: app.cwSource
    })
}

export async function loadCrowdItems() {
    const loader = useLoader();
    const app = useApp()
    return loader.get("crowd/items", {
        guid: app.activeUserId,
        ip: app.ipAddress,
        cwId: app.cwId,
    })
}

export async function getClientStatus() {
    const loader = useLoader()
    const app = useApp()
    return loader.get("similarity/status", {
        guid: app.activeUserId,
        ip: app.ipAddress,
        cwId: app.cwId,
    })
}

export async function getCrowdGUID() {
    const loader = useLoader()
    return loader.get("similarity/guid")
}

export async function postUserCrowdGUID(userId, guid, dataset=null) {
    const app = useApp()
    const loader = useLoader()
    return loader.post("similarity/guid", {
        user_id: userId,
        guid: guid,
        dataset_id: dataset ? dataset : app.ds
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
        guid: app.activeUserId,
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
        guid: app.activeUserId,
        ip: app.ipAddress,
        cwId: app.cwId,
        gameId: game,
        itemId: itemId
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

export async function getSimilarByTarget(target, limit=5) {
    const loader = useLoader();
    return loader.get(`similarity/target/${target}/top/${limit}`)
}

export async function addSimilarity(info, data) {
    const loader = useLoader();
    return loader.post("add/similarity", {
        info: info,
        rows: Array.isArray(data) ? data : [data]
    })
}