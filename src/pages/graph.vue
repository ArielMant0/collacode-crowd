<template>
    <div class="d-flex align-center flex-column">

        <v-btn v-if="showGraph"
            icon="mdi-information"
            variant="flat"
            density="compact"
            @click="infoDialog = true"
            style="position: absolute; top: 45px; right: 5px"/>

        <div v-if="showGraph"
            :style="{ maxWidth: (graphWidth+320)+'px' }"
            style="min-width: 300px; width: 75%;">

            <div class="d-flex align-center">
                <v-text-field v-model="search"
                    label="Search by name (min. 3 characters)"
                    variant="outlined"
                    density="compact"
                    class="mb-2 mt-4"
                    style="width: 75%;"
                    @keyup.prevent="onSearchKey"
                    hide-details
                    hide-spin-buttons
                    clearable>
                </v-text-field>
                <v-btn
                    @click="refreshLayout"
                    class="ml-2 text-caption"
                    density="comfortable"
                    color="secondary">
                    refresh layout
                </v-btn>
            </div>
            <div v-if="search" class="text-caption d-flex">
                <div style="min-width: 70px;"><b>{{ searchHits.length }} {{ searchHits.length === 1 ? 'hit' : 'hits' }}</b></div>
                <div style="width: 100%; max-height: 100px; overflow-y: auto;">
                    <div v-for="item in searchHits"
                        class="cursor-pointer hover-it"
                        @click="setSearchTarget(item)">
                        {{ item.name }}
                    </div>
                </div>
            </div>
            <div class="d-flex align-start justify-space-between">
                <NodeLink v-if="graphData.nodes && graphData.links"
                    ref="nl"
                    :nodes="graphData.nodes"
                    :links="graphData.links"
                    :width="graphWidth"
                    :height="graphHeight"
                    weight-attr="value"
                    image-attr="teaser"
                    use-data-manager
                    use-key-navigation
                    @click="d => setTarget(d.id)"
                    @hover="onHover"
                    :target="target"
                    :radius="50"/>

                <div class="ml-2"
                    style="min-width: 250px; max-width: 300px; overflow-y: auto; overflow-x: hidden;"
                    :style="{ maxHeight: graphHeight+'px' }">

                    <div v-if="target && target > 0">
                        <div class="d-flex justify-center">
                            <ItemTeaser
                                :id="target"
                                :width="140"
                                :height="70"
                                show-name
                                prevent-context
                                prevent-click/>
                        </div>

                        <v-divider class="mt-2 mb-2"></v-divider>
                    </div>

                    <div class="d-flex justify-space-between">
                        <div class="d-flex align-center">
                            <v-btn
                                rounded="1"
                                density="compact"
                                variant="tonal"
                                :disabled="historyIndex <= 0"
                                @click="goPrev"
                                icon="mdi-arrow-left"/>
                            <div class="ml-1 text-caption text-dots" style="max-width: 70px;">{{ prevItemName }}</div>
                        </div>

                        <div class="d-flex align-center">
                            <div class="mr-1 text-caption text-dots" style="max-width: 70px;">{{ nextItemName }}</div>
                            <v-btn
                                rounded="1"
                                density="compact"
                                variant="tonal"
                                :disabled="historyIndex >= history.length-1"
                                @click="goNext"
                                icon="mdi-arrow-right"/>
                        </div>
                    </div>

                    <v-divider class="mt-2 mb-2"></v-divider>

                    <div v-for="item in graphData.connected" class="mb-2 d-flex align-center justify-start">
                        <div class="mr-1">
                            <ItemTeaser
                                :id="item.id"
                                :width="140"
                                :height="70"
                                show-name
                                @click="setTarget(item.id)"
                                prevent-context
                                prevent-open/>

                            <v-progress-linear
                                :model-value="item.percent"
                                style="width: 140px;"
                                height="10"
                                class="mt-1"
                                color="primary">
                            </v-progress-linear>
                        </div>

                        <div style="min-width: 120px;" class="text-caption">
                            <div>Value: {{ item.value }}</div>
                            <div>Count: {{ item.count }}</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        <div v-else>
            <p style="font-size: large; margin-top: 3em;">
                Add similarities for <b>at least 5 {{ app.itemName }}s</b> to explore the similarity graph!
            </p>
        </div>

        <MiniDialog v-model="infoDialog" :min-width="300" :max-width="900" no-actions close-icon>
            <template #text>
                <div style="text-align: center;">
                    <div>
                        This graph shows you which {{ app.itemName }}s are deemed similar by submitters.
                        A link between two {{ app.itemName }}s indicates that someone has judged these to be similar.
                        The thicker the link, the stronger the similarity.
                        <img :src="imgUrl1" class="mt-1" style="max-width: 70%;"/>
                    </div>
                    <v-divider class="mt-3 mb-3"></v-divider>
                    <div>
                        You can use either the mouse or WASD keys to move around in the graph.
                    </div>
                    <v-divider class="mt-3 mb-3"></v-divider>
                    <div class="d-flex flex-column align-center">
                        There are different ways to select an {{ app.itemName }} in this view:
                        <ul class="pl-8" style="max-width: fit-content; text-align: left;">
                            <li>click on an image in the graph</li>
                            <li>click on an image in the side bar</li>
                            <li>search for a {{ app.itemName }} name using the search bar</li>
                            <li>use the left and right arrow buttons to go through the history</li>
                        </ul>
                    </div>
                    <v-divider class="mt-3 mb-3"></v-divider>
                    <div>
                        To search for a specific {{ app.itemName }}, use the text field at the top.
                        Type in a {{ app.itemName }} name and then click on the suggested title you want to see,
                        the graph will automatically zoom to that position.
                        <img :src="imgUrl2" class="mt-1" style="max-width: 70%;"/>
                    </div>
                    <v-divider class="mt-3 mb-3"></v-divider>
                    <div>
                        When you select a {{ app.itemName }}, the side bar will show all its connected similar {{ app.itemName }}s.
                        <img :src="imgUrl3" class="mt-1" style="max-width: 70%;"/>
                    </div>
                </div>
            </template>
        </MiniDialog>
    </div>
</template>

<script setup>
    import DM from '@/use/data-manager';
    import { useTimes } from '@/stores/times';
    import { useWindowSize } from '@vueuse/core';
    import { computed, onMounted, reactive, useTemplateRef, watch } from 'vue';
    import NodeLink from '@/components/vis/NodeLink.vue';
    import ItemTeaser from '@/components/items/ItemTeaser.vue';
    import { max } from 'd3';
    import { useApp } from '@/stores/app';
    import { useTooltip } from '@/stores/tooltip';
    import MiniDialog from '@/components/MiniDialog.vue';

    import imgUrl1 from '@/assets/graph-tutorial-links.jpg'
    import imgUrl2 from '@/assets/graph-tutorial-search.jpg'
    import imgUrl3 from '@/assets/graph-tutorial-sidebar.jpg'
    import { loadLastUpdate } from '@/use/data-api';

    const app = useApp()
    const tt = useTooltip()
    const times = useTimes()
    const { width, height } = useWindowSize()

    const nl = useTemplateRef("nl")

    const graphWidth = computed(() => Math.max(300, Math.min(1000, width.value-300)))
    const graphHeight = computed(() => Math.max(400, Math.min(1000, Math.floor(height.value*0.80))))

    const infoDialog = ref(false)

    const search = ref("")
    const searchHits = computed(() => {
        if (search.value && search.value.length > 2) {
            const reg = new RegExp(search.value, "gi")
            return graphData.nodes.filter(d => reg.test(DM.getDataItem("items_name", d.id)))
        }
        return []
    })

    const history = ref([])
    const historyIndex = ref(0)
    const prevItemName = ref("")
    const nextItemName = ref("")

    const target = ref(-1)
    const graphData = reactive({
        nodes: [],
        links: [],
        connected: []
    })
    const showGraph = computed(() => app.numSubmissions >= 5)

    function setSearchTarget(item) {
        search.value = ""
        setTarget(item.id)
    }
    function goPrev() {
        if (historyIndex.value > 0) {
            historyIndex.value--
        }
        goTo()
    }
    function goNext() {
        if (historyIndex.value < history.value.length) {
            historyIndex.value++
        }
        goTo()
    }
    function goTo() {
        if (historyIndex.value >= 0 && history.value.length > historyIndex.value) {
            setTarget(history.value[historyIndex.value], false)
            updateHistoryItems()
        }
    }
    function updateHistoryItems() {
        prevItemName.value = historyIndex.value > 0 ?
            DM.getDataItem("items_name", history.value[historyIndex.value-1]) :
            ""
        nextItemName.value = historyIndex.value < history.value.length-1 ?
            DM.getDataItem("items_name", history.value[historyIndex.value+1]) :
            ""
    }

    function refreshLayout() {
        if (nl.value) {
            nl.value.draw()
        }
    }

    function onSearchKey(event) {
        if (search.value && search.value.length > 0) {
            if (event.code === "Escape") {
                search.value = []
            } else if (event.code === "Enter") {
                if (searchHits.value.length > 0) {
                    setSearchTarget(searchHits.value[0])
                }
            }
        }
    }

    function onHover(item=null, event=null) {
        if (item !== null) {
            tt.showItem(event, item)
        } else {
            tt.hide()
        }
    }

    function setTarget(id, record=true) {
        target.value = id
        if (id && id > 0) {
            const tmp = graphData.links.filter(l => l.source === id || l.target === id)
            tmp.sort((a, b) => b.value - a.value)
            const maxValue = max(tmp, d => d.value)
            graphData.connected = tmp.map(l => {
                const oid = l.source === id ? l.target : l.source
                return {
                    id: oid,
                    count: l.count,
                    value: l.value,
                    percent: Math.floor((l.value / maxValue) * 100)
                }
            })
            if (record) {
                const last = history.value.length > 0 ? history.value.at(-1) : null
                if (!last || last !== id) {
                    history.value.push(id)
                    if (history.value.length >= 30) {
                        history.value = history.value.slice(10, history.value.length)
                    }
                    historyIndex.value = history.value.length-1
                }
                updateHistoryItems()
            }
        } else {
            graphData.connected = []
        }
    }

    async function checkUpdate() {
        try {
            const updates = await loadLastUpdate()
            const cut = updates.find(d => d.name === "similarity")
            if (cut && cut.timestamp > times.similarity) {
                times.needsReload("similarity")
            }
        } catch(e) {
            console.error(e)
        }
    }

    function read() {
        if (DM.hasGraph()) {
            const graph = DM.getGraph()
            graphData.nodes = graph.nodes
            graphData.links = graph.links
        }
    }

    onMounted(async function() {
        await checkUpdate()
        read()
    })

    watch(() => Math.max(times.all, times.similarity), read)
</script>