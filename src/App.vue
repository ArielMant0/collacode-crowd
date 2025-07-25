<template>
    <div>
        <v-overlay v-if="allowOverlay" :model-value="showOverlay" class="d-flex justify-center align-center" persistent>
            <v-progress-circular indeterminate size="64" color="white"></v-progress-circular>
        </v-overlay>
        <GlobalTooltip/>

        <div v-if="initialized" :style="{ maxWidth: '100vw' }">
            <router-view style="max-height: none"/>
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
    import { toTreePath } from '@/use/utility';
    import { useRoute } from 'vue-router';
    import router from './router';

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


    async function loadData() {
        isLoading.value = true;
        // get tags and datatags
        await loadTags()
        await loadDataTags(false)
        // add data to games
        await loadItems();
        isLoading.value = false;
    }

    async function loadCrowdMeta() {
        try {
            const result = await api.loadCrowdMeta()
            app.setCrowdMeta(result)
        } catch (e) {
            console.error(e.toString())
            toast.error("error loading crowd info")
        }
    }

    async function loadCrowdItems() {
        try {
            const result = await api.loadCrowdItems()
            app.setCrowdItems(result)
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

    async function loadSimilarities(update=true) {
        try {
            const result = await api.getSimilarities()
            const byItem = group(result, d => d.target_id)
            if (update && DM.hasData("items")) {
                const data = DM.getData("items", false)
                data.forEach(d => {
                    if (byItem.has(d.id)) {
                        const warnings = getTagWarnings(d, byItem.get(d.id))
                        d.warnings = warnings
                    } else {
                        d.warnings = []
                    }
                })
            }
            DM.setData("similarity", result)
            DM.setData("similarity_item", new Map(byItem.entries()))
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
            DM.setData("items_name", new Map(data.map(d => ([d.id, d.name]))))
            DM.setData("items", data)
            DM.setData("items_id", new Map(data.map(d => ([d.id, d]))))
        }
    }

    function readQuery() {
        // check if we were passed a crowd worker id
        if (route.query.prolific_id) {
            const before = app.cwId
            app.cwId = ""+route.query.prolific_id
            app.cwSource = "prolific"
            return before !== app.cwId
        }
        return false
    }

    async function readClient() {
        readQuery()

        // try to read the users id
        const guid = localStorage.getItem("crowd-guid")
        if (guid) {
            app.setActiveUser(guid)
        }

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



    onMounted(async () => {
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
        }

        initialized.value = true
    });

    watch(() => times.n_all, async function() {
        const showToast = initialized.value
        if (showToast) toast.info("reloading all data..")
        allowOverlay.value = true
        await Promise.all([loadData(), loadCrowdItems()])
        allowOverlay.value = false
        if (showToast) toast.success("reloaded data")
        times.reloaded("all")
    });

    watch(() => times.n_transitioning, async function() {
        await Promise.all([loadCodes(), loadCodeTransitions()])
        times.reloaded("transitioning")
    });

    watch(() => times.n_crowd, loadCrowdItems);
    watch(() => times.n_items, loadItems);
    watch(() => times.n_tags, loadTags);
    watch(() => times.n_datatags, loadDataTags);
    watch(() => times.n_similarity, loadSimilarities);

    watch(updateItemsTime, () => updateAllItems())

    watch(activeUserId, function() {
        if (app.activeUserId) {
            localStorage.setItem("crowd-guid", app.activeUserId)
            if (app.isCrowdWorker) {
                localStorage.setItem("cw-id", app.cwId)
                localStorage.setItem("cw-source", app.cwSource)
            }
        }
    })

    router.afterEach(function() {
        if (readQuery()) {
            loadCrowd()
        }
    })

</script>

<style>
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
