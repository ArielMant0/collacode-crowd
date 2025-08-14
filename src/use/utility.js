import DM from "./data-manager";
import { APP_URLS, useApp } from "@/stores/app";
import { format, quantile } from "d3";
import { useLoader } from "./loader";
import { sortObjByValue } from "./sorting";

let count = 0;

export function toTreePath(tag, tags) {
    tags = tags ? tags : DM.getData("tags", false);
    let curr = tag;
    const ids = [];
    while (curr) {
        ids.push(curr.id);
        curr = tags.find(d => d.id === curr.parent);
    }
    return ids.reverse();
}

function getSubtreeRec(node, tree, ids) {
    if (node && tree) {
        ids.push(node.id);
        const children = tree.filter(d => d.parent === node.id);
        children.forEach(c => getSubtreeRec(c, tree, ids))
    }
    return ids
}

export function getSubtree(node, tree) {
    tree = tree && typeof tree !== "string" ? tree : DM.getData(tree ? tree : "tags", false);
    const ids = [];
    return getSubtreeRec(node, tree, ids)
}

export function uid(name) {
    return new Id("O-" + (name == null ? "" : name + "-") + ++count);
  }

export class Id {
    constructor(id) {
        this.id = id;
        this.href = new URL(`#${id}`, location) + "";
    }
    toString() {
        return "url(" + this.href + ")";
    }
}

export function formatPath(path) {
    const arr = path.split(" / ")
    return arr.length === 1 ?
        `<b>${arr[0]}</b>` :
        [
            arr.at(0)+"<br/>",
            arr.length === 3 ? "<span class='ml-3'>..</span><br/>" : `<span class='ml-3'>.. (${arr.length-2}x)</span><br/>`,
            `<b class="ml-6">${arr.at(-1)}</b>`
        ].join("")
}
export function formatNumber(number, digits=3) {
    return Number.isInteger(number) && number < 10**digits ? number : format(`.${digits}s`)(number)
}
export function formatStats(number, digits=3) {
    return Number.isInteger(number) && number < 10**digits ? number : format(`,.${digits}r`)(number)
}

export function compareString(a, b) {
    const nameA = a.toLowerCase(); // ignore upper and lowercase
    const nameB = b.toLowerCase(); // ignore upper and lowercase
    if (nameA < nameB) { return -1; }
    if (nameA > nameB) { return 1; }
    // names must be equal
    return 0;
}

export function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); // $& means the whole matched string
}

export function capitalize(string) {
    return string.trim().split(" ").map(d => d.length > 0 ? d[0].toUpperCase()+d.slice(1) : d).join(" ")
}

export function openInNewTab(url) {
    window.open(url, "_blank").focus()
}

export function mediaPath(mediaType, path, dataset=null) {
    const app = useApp()
    const loader = useLoader()
    dataset = dataset !== null ? dataset : app.ds
    let base
    switch (mediaType) {
        case "teaser":
            base = APP_URLS.TEASER + (APP_URLS.TEASER.endsWith("/") ? "" : "/")
            break
        case "evidence":
            base = APP_URLS.EVIDENCE + (APP_URLS.EVIDENCE.endsWith("/") ? "" : "/")
            break
    }
    return loader.url(base + dataset + "/" + path)
}

export function dataPath(dataType, dataset=null) {
    return APP_URLS.DATA +
        (APP_URLS.DATA.endsWith("/") ? "" : "/") +
        (dataset !== null ? dataset + "/"  : "") +
        dataType + ".csv"
}

export function isVideo(path) {
    return path && (
        path.toLowerCase().endsWith("mp4") ||
        path.toLowerCase().endsWith("mov") ||
        path.toLowerCase().endsWith("mkv")
    )
}

export function getValue(d, accessor) {
    switch (typeof accessor) {
        case "string":
            return d[accessor]
        case "function":
            return accessor(d)
    }
    return undefined
}

export function constructSimilarityGraph(data, minClients=1, attr="") {
    // get similarity data
    const sn = [], sl = []
    const nodeSet = new Set()

    const items = DM.getData("items", false)

    // construct the graph
    data.forEach(d => {
        if (d.unique_clients < minClients) return
        const id = Number(d.target_id)
        const oid = Number(d.item_id)

        // add the main node
        if (!nodeSet.has(id)) {
            const obj = { id: id, name: "unknown", teaser: null }
            const it = items.find(d => d.id === id)
            if (it) {
                obj.name = it.name
                obj.teaser = mediaPath("teaser", it.teaser)
            }
            sn.push(obj)
            nodeSet.add(id)
        }

        // add the connected node if not already present
        if (!nodeSet.has(oid)) {
            const obj = { id: oid, name: "unknown", teaser: null }
            const it = items.find(d => d.id === oid)
            if (it) {
                obj.name = it.name
                obj.teaser = mediaPath("teaser", it.teaser)
            }
            sn.push(obj)
            nodeSet.add(oid)
        }

        const ex = sl.find(d => d.source === id && d.target === oid || d.source === oid && d.target === id)
        if (ex) {
            // update existing link
            ex.unique += d.unique_clients
            ex.submissions += d.unique_submissions
            ex.value += d["value"+attr]
            ex.count += d["count"+attr]
        } else {
            // add new link
            sl.push({
                id: sl.length+1,
                source: id,
                target: oid,
                unique: d.unique_clients,
                submissions: d.unique_submissions,
                value: d["value"+attr],
                count: d["count"+attr]
            })
        }
    })

    return { nodes: sn, links: sl }
}

export function getGameWords() {
    return [
        "remaster edition",
        "remastered edition",
        "definitive edition",
        "complete edition",
        "enhanced edition",
        "extended edition",
        "expanded edition",
        "extended cut",
        "game of the year edition",
        "goty edition",
        "history edition",
        "legendary edition",
        "deluxe edition",
        "collectors edition",
        "collector's edition",
        "limited edition",
        "special edition",
        "gold edition",
        "ultimate edition",
        "game of the year",
        "goty",
        "remaster",
        "remastered",
        "edition"
    ]
}

export function getStopWords() {
    return [
        "game", "edition",
        "i", "me", "my", "myself",
        "we", "our", "ours", "ourselves",
        "you", "your", "yours", "yourself", "yourselves",
        "he", "him", "his", "himself",
        "she", "her", "hers", "herself",
        "it", "its", "itself",
        "they", "them", "their", "theirs", "themselves",
        "what", "which", "who", "whom",
        "this", "that", "these", "those",
        "am", "is", "are", "was", "were",
        "be", "been", "being",
        "have", "has", "had", "having",
        "do", "does", "did", "doing",
        "a", "an", "the", "and", "but", "if", "or",
        "ii", "iii", "iv", "v", "vi", "vii", "viii", "viiii", "x",
        "because",
        "until",
        "while",
        "of",
        "at",
        "by",
        "for",
        "with",
        "about",
        "against",
        "between",
        "into",
        "through",
        "during",
        "before",
        "after",
        "above",
        "below",
        "to",
        "from",
        "up",
        "down",
        "in",
        "out",
        "on",
        "off",
        "over",
        "under",
        "again",
        "further",
        "then",
        "once",
        "here",
        "there",
        "when",
        "where",
        "why",
        "how",
        "all",
        "any",
        "both",
        "each",
        "few",
        "more",
        "most",
        "other",
        "some",
        "such",
        "no",
        "nor",
        "not",
        "only",
        "own",
        "same",
        "so",
        "than",
        "too",
        "very",
        "can",
        "will",
        "just",
        "should",
        "now",
    ]
}
