<template>
    <div>
        <v-overlay v-if="allowOverlay" :model-value="showOverlay" class="d-flex justify-center align-center" persistent>
            <v-progress-circular indeterminate size="64" color="white"></v-progress-circular>
        </v-overlay>
        <GlobalTooltip/>

        <div v-if="initialized" :style="{ maxWidth: '100vw' }">
            <router-view/>
        </div>
    </div>
</template>

<script setup>

    import { useApp } from '@/stores/app'
    import { useToast } from "vue-toastification";
    import { storeToRefs } from 'pinia'
    import { ref, onMounted, watch, computed } from 'vue'
    import DM from '@/use/data-manager'
    import * as api from '@/use/data-api';

    import { useSettings } from '@/stores/settings';
    import { group } from 'd3';
    import { useTimes } from '@/stores/times';
    import { sortObjByString } from '@/use/sorting';
    import GlobalTooltip from '@/components/GlobalTooltip.vue';
    import { useSounds } from '@/stores/sounds';
    import { constructSimilarityGraph, getGameWords, getStopWords, toTreePath } from '@/use/utility';
    import { useRoute } from 'vue-router';
    import router from './router';
    import { randomShuffle } from './use/random';

    const toast = useToast();
    const settings = useSettings();
    const app = useApp()
    const times = useTimes()
    const sounds = useSounds()
    const route = useRoute()

    const {
        initialized,
        updateItemsTime,
        activeUserId
    } = storeToRefs(app);

    const { isLoading } = storeToRefs(settings)

    const allowOverlay = ref(false)
    const showOverlay = computed(() => allowOverlay.value && isLoading.value)

    let readRouteOnce = false

    async function loadData() {
        isLoading.value = true;
        // get tags and datatags
        await loadTags()
        await loadDataTags(false)
        // add data to games
        await loadItems();
        isLoading.value = false;
    }

    function storeClientData() {
        if (app.activeUserId) {
            localStorage.setItem("crowd-client", app.activeUserId)
        }
        if (app.guid) {
            localStorage.setItem("crowd-guid", app.guid)
        }
        if (app.userSrc) {
            localStorage.setItem("crowd-source", app.userSrc)
        }

        // crowd worker related
        if (app.cwId) {
            localStorage.setItem("cw-id", app.cwId)
        } else {
            localStorage.removeItem("cw-id")
        }
        if (app.cwId && app.cwSubmitted) {
            localStorage.setItem("cw-submitted", app.cwSubmitted)
        }
    }

    async function loadCrowdMeta() {
        try {
            const result = await api.loadCrowdMeta()
            app.setCrowdMeta(result)
            storeClientData()
        } catch (e) {
            console.error(e.toString())
            toast.error("error loading crowd info")
        }
    }

    async function loadCrowdItems() {
        try {
            const result = await api.loadCrowdItems()
            app.setCrowdItems(result)
            storeClientData()
        } catch (e) {
            console.error(e.toString())
            toast.error("error loading crowd items")
        }
        times.reloaded("crowd")
    }

    async function loadCrowd() {
        try {
            await loadCrowdMeta()
            await loadCrowdItems()
            await loadFeedback()
        } catch (e) {
            console.error(e.toString())
            toast.error("error loading crowd data")
        }
    }

    async function loadItems() {
        if (!app.code) return;
        try {
            const result = await api.loadItemsByCode(app.code)
            updateAllItems(result);
        } catch (e) {
            console.error(e.toString())
            toast.error("error loading items for code")
        }
        times.reloaded("items")
    }

    async function loadTags() {
        if (!app.code) return;
        try {
            const result = await api.loadTagsByCode(app.code)

            result.forEach(t => {
                t.parent = t.parent === null ? -1 : t.parent;
                t.path = toTreePath(t, result);
                t.pathNames = t.path.map(dd => result.find(tmp => tmp.id === dd).name).join(" / ")
            });
            result.sort(sortObjByString("name"))

            const sortByTree = result.map(d => Object.assign({}, d))
            sortByTree.sort((a, b) => {
                const l = Math.min(a.path.length, b.path.length);
                for (let i = 0; i < l; ++i) {
                    if (a.path[i] !== b.path[i]) return a.path[i]-b.path[i]
                }
                return a.path.length-b.path.length
            });
            DM.setData("tags_tree", sortByTree)

            DM.setData("tags", result)
            DM.setData("tags_name", new Map(result.map(d => ([d.id, d.name ? d.name : '']))))

            // store long form of tag names
            const prefix = /^([a-zA-Z0-9\-_]+:)/gi
            DM.setData("tags_name_long", new Map(result.map(d => {
                const pname = d.is_leaf === 1 && d.parent > 0 ?
                    DM.getDataItem("tags_name", d.parent).replace(prefix, "").trim() :
                    null
                return [d.id, d.is_leaf === 1 ? d.name.replace(prefix, pname+":") : d.name]
            })))
            result.forEach(d => d.longName = DM.getDataItem("tags_name_long", d.id))

            DM.setData("tags_desc", new Map(result.map(d => ([d.id, d.description ? d.description : 'no description']))))
        } catch (e) {
            console.error(e.toString())
            toast.error("error loading tags")
        }
        times.reloaded("tags")
    }

    async function loadDataTags(update=true) {
        if (!app.code) return;
        try {
            const result = await api.loadDataTagsByCode(app.code)

            if (update && DM.hasData("items") && DM.hasData("tags")) {
                const data = DM.getData("items", false)
                const tags = DM.getData("tags", false)

                const sortFunc = sortObjByString("name")
                const groupDT = group(result, d => d.item_id)

                const tagCounts = new Map()
                const userTagCounts = new Map()

                tags.forEach(t => {
                    tagCounts.set(t.id, 0)
                    userTagCounts.set(t.id, new Map())
                })

                data.forEach(g => {
                    g.tags = [];
                    g.allTags = []
                    g.coders = []
                    g.numCoders = 0

                    if (groupDT.has(g.id)) {
                        const array = groupDT.get(g.id)
                        const m = new Set()
                        const coders = new Set()
                        array.forEach(dt => {
                            const t = tags.find(d => d.id === dt.tag_id)
                            if (!t) return;

                            // count tags (per user)
                            const pu = userTagCounts.get(t.id)
                            pu.set(dt.created_by, (pu.get(dt.created_by) || 0) + 1)
                            // save user/coder
                            coders.add(dt.created_by)

                            if (!m.has(t.id)) {
                                // count tags (overall)
                                tagCounts.set(t.id, tagCounts.get(t.id)+1)
                                g.allTags.push({
                                    id: t.id,
                                    name: t.name,
                                    created_by: t.created_by,
                                    path: t.path ? t.path : toTreePath(t, tags),
                                    pathNames: t.pathNames
                                });
                            }
                            m.add(t.id)
                            dt.name = t.name
                            dt.path = t.path ? t.path : toTreePath(t, tags)
                            dt.pathNames = t.pathNames
                        })

                        g.tags = array.filter(d => d.pathNames !== undefined)
                        g.tags.sort(sortFunc)
                        g.allTags.sort(sortFunc)
                        g.numTags = g.allTags.length
                        g.numCoders = coders.size;
                        g.coders = Array.from(coders.values())
                        g.coders.sort()
                    }
                });

                DM.setData("tags_counts", tagCounts)
                DM.setData("tags_user_counts", userTagCounts)
            }

            DM.setData("datatags", result)
        } catch (e) {
            console.error(e.toString())
            toast.error("error loading datatags")
        }
        times.reloaded("datatags")
    }

    async function loadSimilarities() {
        try {
            const result = await api.getSimilarities()
            const graph = constructSimilarityGraph(result)
            DM.setData("similarity", result)
            DM.setGraph(graph)
        } catch {
            toast.error("error loading similarities")
        }
        times.reloaded("similarity")
    }

    function updateAllItems(passed=null) {
        if (!Array.isArray(passed) && !DM.hasData("items")) return console.warn("missing data")

        const data = Array.isArray(passed) ? passed : DM.getData("items", false)

        const tags = DM.getData("tags", false);
        const dts = DM.getData("datatags", false)

        const tagCounts = new Map()
        const userTagCounts = new Map()
        tags.forEach(t => {
            tagCounts.set(t.id, 0)
            userTagCounts.set(t.id, new Map())
        })

        const groupDT = group(dts, d => d.item_id)

        const sortFunc = sortObjByString("name")

        data.forEach(g => {
            g.tags = [];
            g.allTags = [];
            g.numCoders = 0;
            g.coders = [];

            if (groupDT.has(g.id)) {
                const array = groupDT.get(g.id)
                const m = new Set()
                const coders = new Set()
                array.forEach(dt => {
                    const t = tags.find(d => d.id === dt.tag_id)
                    if (!t) return;

                    // count tags (per user)
                    const pu = userTagCounts.get(t.id)
                    pu.set(dt.created_by, (pu.get(dt.created_by) || 0) + 1)
                    // save user/coder
                    coders.add(dt.created_by)

                    if (!m.has(t.id)) {
                        // count tags (overall)
                        tagCounts.set(t.id, tagCounts.get(t.id)+1)
                        g.allTags.push({
                            id: t.id,
                            name: t.name,
                            created_by: t.created_by,
                            path: t.path ? t.path :toTreePath(t, tags),
                            pathNames: t.pathNames
                        });
                    }
                    m.add(t.id)
                    dt.name = t.name
                    dt.path = t.path ? t.path :toTreePath(t, tags)
                    dt.pathNames = t.pathNames
                })

                g.tags = array.filter(d => d.name !== undefined)
                g.tags.sort(sortFunc)
                g.allTags.sort(sortFunc)
                g.numTags = g.allTags.length
                g.numCoders = coders.size
                g.coders = Array.from(coders.values())
                g.coders.sort()
            }
        });

        DM.setData("tags_counts", tagCounts)
        DM.setData("tags_user_counts", userTagCounts)

        if (passed !== null) {
            const shuffled = randomShuffle(data)
            shuffled.forEach((d,i) => d.index = i)
            DM.setData("items", shuffled)
            DM.setData("items_name", new Map(data.map(d => ([d.id, d.name]))))
            DM.setData("items_id", new Map(data.map(d => ([d.id, d]))))
        }
    }

    async function loadFeedback() {
        if (!app.activeUserId) return
        try {
            const res = await api.getClientRatings()
            for (const gameId in res) {
                app.numFeedback[gameId] = Object.values(res[gameId])
                    .reduce((acc, d) => acc + (d !== null ? 1 : 0), 0)
            }
        } catch (e) {
            console.error(e.toString())
        }
    }

    function readQuery() {
        let pid = null
        if (route.query.prolific_pid) {
            pid = "" + route.query.prolific_pid
        }
        if (route.query.PROLIFIC_PID) {
            pid = "" + route.query.PROLIFIC_PID
        }

        let src = null
        if (route.query.source) {
            src = "" + route.query.source
        }
        if (route.query.SOURCE) {
            src = "" + route.query.SOURCE
        }

        if (src) {
            localStorage.setItem("crowd-source", src)
        }

        // check if we were passed a crowd worker id
        if (pid) {
            const before = app.cwId ? app.cwId : localStorage.getItem("cw-id")
            if (before !== pid) {
                localStorage.setItem("cw-id", pid)
                localStorage.setItem("crowd-source", "prolific")
                localStorage.removeItem("crowd-client")
                localStorage.removeItem("crowd-guid")
                return true
            }
        }
        return false
    }

    async function readClient() {
        readQuery()

        // try to read the users id from local storage
        const clientId = Number.parseInt(localStorage.getItem("crowd-client"))
        const guid = localStorage.getItem("crowd-guid")
        const userSrc = localStorage.getItem("crowd-source")
        // crowd sourcing data
        const cwid = localStorage.getItem("cw-id")
        app.setActiveUser(clientId, guid, userSrc, cwid)

        // try to get the user's ip address
        try {
            const ipres = await fetch("https://api.ipify.org?format=json")
            const ipaddr = await ipres.json()
            app.ipAddress = ipaddr.ip
        } catch (e) {
            console.error(e.toString())
            console.error("could not get ip address")
        }
    }
    async function init() {
        if (!readRouteOnce) {
            return setTimeout(init, 250)
        }

        allowOverlay.value = true

        window.addEventListener("click", () => sounds.loadSounds(), { once: true })

        initialized.value = false
        // read client data
        await readClient()

        // load meta data
        await loadCrowd()

        // load actual game data
        if (app.ds) {
            await loadData()
            await loadSimilarities()
        }

        // const stopWords = new Set(getStopWords())
        // const gameWords = getGameWords()
        // const rSp = new RegExp("\\s{2,}", "gi")
        // const rDel = new RegExp("[&®©™'\(\)0-9\.,’;_]", "gi")
        // const process = name => {
        //     let lower = name.toLowerCase()
        //     gameWords.forEach(w => {
        //         if (lower.includes(w)) {
        //             lower = lower.replace(w, "")
        //         }
        //     })
        //     const str = lower.replaceAll(rDel, "").replaceAll(rSp, " ")
        //     return str.split(/[:\-]/gi)
        //         .map(s => s
        //             .split(" ")
        //             .map(w => w.trim())
        //             .filter(w => !stopWords.has(w))
        //             .join(" ")
        //             .trim()
        //         )
        //         .filter(s => s && s.length > 0)
        // }
        // const items = DM.getData("items", false)
        // const names = items.map(d => process(d.name))
        // for (let i = 0; i < items.length; ++i) {
        //     console.log(`target: ${items[i].name} (${names[i]})`)
        //     for (let j = 0; j < items.length; ++j) {
        //         if (i === j) continue
        //         if (names[i].some(n1 => names[j].some(n2 => n1 === n2))) {
        //             console.log(`\t${items[j].name} (${names[j]})`)
        //         }
        //     }
        //     console.log("  ")
        // }

        initialized.value = true
    }

    onMounted(init);

    watch(() => times.n_all, async function() {
        const showToast = initialized.value
        if (showToast) toast.info("reloading all data..")
        allowOverlay.value = true
        await Promise.all([loadCrowd(), loadData(), loadCrowdItems()])
        await loadSimilarities()
        allowOverlay.value = false
        if (showToast) toast.success("reloaded data")
        times.reloaded("all")
    });

    watch(() => times.n_crowd, loadCrowdItems);
    watch(() => times.n_crowd_meta, loadCrowdMeta);
    watch(() => times.n_similarity, loadSimilarities);

    watch(updateItemsTime, () => updateAllItems())

    watch(activeUserId, function() {
        if (app.activeUserId) {
            storeClientData()
        }
    })

    router.afterEach(function() {
        if (initialized.value && readQuery()) {
            loadCrowd()
        }
        readRouteOnce = true
    })

</script>

<style>
html {
    scroll-behavior: smooth;
}
body {
    width: 100%;
}
.topnav {
    background-color: #333;
    position: sticky;
    top: 0;
    left: 0;
    width: 100dvw;
    z-index: 2;
    font-size: smaller;
}
</style>
