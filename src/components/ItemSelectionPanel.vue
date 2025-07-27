<template>

    <v-card rounded="lg" class="panel" :class="[textClass, panelClass]">
        <v-card-title v-if="title">
            <div style="font-weight: 400; font-size: 30px;" class="bitcount-prop-double">
                {{ title }}
            </div>
            <div v-if="subtitle" class="text-caption" style="margin-top: -5px;">
                {{ subtitle }}
            </div>
        </v-card-title>

        <v-card-text>
            <div
                class="d-flex align-center ml-4 mr-4"
                :class="{
                    'justify-space-between': sortable && numPages > 1,
                    'justify-end': !sortable && numPages > 1
                }">
                <v-btn-toggle v-if="sortable"
                    v-model="sortBy"
                    :mandatory="false"
                    variant="flat"
                    density="comfortable"
                    :color="mainColor"
                    @update:model-value="applySort">
                    <v-btn icon="mdi-sort-variant" :value="1"></v-btn>
                    <v-btn icon="mdi-sort-reverse-variant" :value="2"></v-btn>
                </v-btn-toggle>

                <v-pagination v-if="numPages > 1"
                    v-model="page"
                    :length="numPages"
                    show-first-last-page
                    density="compact"
                    :total-visible="5">
                </v-pagination>
            </div>

            <div class="d-flex flex-wrap justify-center mt-2">
                <v-sheet v-for="item in visibleItems" rounded="lg" color="surface" class="pa-2 mr-3 mb-3" elevation="2">
                    <ItemProgress :value="itemCounts[item.id]" :target="countTarget"/>
                    <ItemTeaser v-if="selectable"
                        :item="item"
                        @click="emit('click', item)"
                        prevent-open/>
                    <ItemTeaser v-else
                        :item="item"
                        hide-overlay
                        prevent-click
                        style="opacity: 0.33"/>
                </v-sheet>
            </div>

        </v-card-text>
    </v-card>
</template>

<script setup>
    import { computed, onMounted, watch } from 'vue';
    import ItemProgress from './items/ItemProgress.vue';
    import ItemTeaser from './items/ItemTeaser.vue';
    import { useApp } from '@/stores/app';
    import { storeToRefs } from 'pinia';
    import DM from '@/use/data-manager';
    import { useTimes } from '@/stores/times';
    import { useSettings } from '@/stores/settings';

    const app = useApp()
    const times = useTimes()
    const settings = useSettings()

    const { itemCounts } = storeToRefs(app)

    const props = defineProps({
        subset: {
            type: Number,
            required: true,
            validator: v => v === 0 || v === 1 | v === 2
        },
        title: {
            type: String
        },
        subtitle: {
            type: String
        },
        numPerPage: {
            type: Number,
            default: 30,
        },
        selectable: {
            type: Boolean,
            default: true
        },
        sortable: {
            type: Boolean,
            default: true
        },
        countTarget: {
            type: Number,
            default: 100
        },
    })

    const emit = defineEmits(["click"])

    const items = ref([])
    const visibleItems = computed(() => {
        if (numPages.value === 1) {
            return items.value
        }
        const start = (page.value-1) * props.numPerPage
        const end = Math.min(start + props.numPerPage, items.value.length)
        return items.value.slice(start, end)
    })

    const page = ref(1)
    const numPages = computed(() => Math.ceil(items.value.length / props.numPerPage))

    const sortBy = ref(settings.panelSort[props.subset])

    const textClass = computed(() => {
        switch(props.subset) {
            default:
            case 0: return "text-teal-darken-4"
            case 1: return "text-deep-purple-darken-2"
            case 2: return "text-error"
        }
    })
    const panelClass = computed(() => {
        switch(props.subset) {
            default:
            case 0: return "panel-yes"
            case 1: return "panel-done"
            case 2: return "panel-no"
        }
    })
    const mainColor = computed(() => {
        switch(props.subset) {
            default:
            case 0: return "primary"
            case 1: return "deep-purple"
            case 2: return "error"
        }
    })

    function applySort() {
        if (!props.sortable) return
        settings.panelSort[props.subset] = sortBy.value
        items.value.sort((a, b) => {
            switch(sortBy.value) {
                // sort by id (ascending)
                default:
                case 0: return a.id - b.id
                // sort by count (descending)
                case 1: return itemCounts.value[b.id] - itemCounts.value[a.id]
                // sort by count (ascending)
                case 2: return itemCounts.value[a.id] - itemCounts.value[b.id]
            }
        })
    }

    function read() {
        let tmp
        switch (props.subset) {
            case 0:
                tmp = DM.getDataBy("items", d => app.itemsLeft.has(d.id))
                tmp.forEach(d => d._done = false)
                break
            case 1:
                tmp = DM.getDataBy("items", d => app.itemsDone.has(d.id))
                tmp.forEach(d => d._done = true)
                break
            case 2:
                tmp = DM.getDataBy("items", d => app.itemsGone.has(d.id))
                tmp.forEach(d => d._done = true)
                break
        }
        items.value = tmp
        applySort()
    }

    onMounted(read)

    watch(() => Math.max(times.all, times.crowd), read)
    watch(() => props.subset, read)
    watch(numPages, function(num) {
        if (page.value > num) {
            page.value = num
        }
    })

</script>

<style scoped>
.panel {
    text-align: center;
    /* backdrop-filter: blur(8px); */
}
.panel-yes {
  --s: 306px; /* control the size*/
  --c1: #acc4c5;
  --c2: #94b4b1;
  --c3: #e5e5f7;

  --_l:#0000 calc(25%/3),var(--c1) 0 25%,#0000 0;
  --_g:conic-gradient(from 120deg at 50% 87.5%,var(--c1) 120deg,#0000 0);
  background:
    var(--_g),var(--_g) 0 calc(var(--s)/2),
    conic-gradient(from 180deg at 75%,var(--c2) 60deg,#0000 0),
    conic-gradient(from 60deg at 75% 75%,var(--c1) 0 60deg,#0000 0),
    linear-gradient(150deg,var(--_l)) 0 calc(var(--s)/2),
    conic-gradient(at 25% 25%,#0000 50%,var(--c2) 0 240deg,var(--c1) 0 300deg,var(--c2) 0),
    linear-gradient(-150deg,var(--_l)) var(--c3);
  background-size: calc(0.866*var(--s)) var(--s);
}

.panel-done {
  --s: 306px; /* control the size*/
  --c1: #cbc3da;
  --c2: #b6accf;
  --c3: #e6ddeb;

  --_l:#0000 calc(25%/3),var(--c1) 0 25%,#0000 0;
  --_g:conic-gradient(from 120deg at 50% 87.5%,var(--c1) 120deg,#0000 0);
  background:
    var(--_g),var(--_g) 0 calc(var(--s)/2),
    conic-gradient(from 180deg at 75%,var(--c2) 60deg,#0000 0),
    conic-gradient(from 60deg at 75% 75%,var(--c1) 0 60deg,#0000 0),
    linear-gradient(150deg,var(--_l)) 0 calc(var(--s)/2),
    conic-gradient(at 25% 25%,#0000 50%,var(--c2) 0 240deg,var(--c1) 0 300deg,var(--c2) 0),
    linear-gradient(-150deg,var(--_l)) var(--c3);
  background-size: calc(0.866*var(--s)) var(--s);
}

.panel-no {
  --s: 306px; /* control the size*/
  --c1: #dac3c3;
  --c2: #cfacac;
  --c3: #f7ebe5;

  --_l:#0000 calc(25%/3),var(--c1) 0 25%,#0000 0;
  --_g:conic-gradient(from 120deg at 50% 87.5%,var(--c1) 120deg,#0000 0);
  background:
    var(--_g),var(--_g) 0 calc(var(--s)/2),
    conic-gradient(from 180deg at 75%,var(--c2) 60deg,#0000 0),
    conic-gradient(from 60deg at 75% 75%,var(--c1) 0 60deg,#0000 0),
    linear-gradient(150deg,var(--_l)) 0 calc(var(--s)/2),
    conic-gradient(at 25% 25%,#0000 50%,var(--c2) 0 240deg,var(--c1) 0 300deg,var(--c2) 0),
    linear-gradient(-150deg,var(--_l)) var(--c3);
  background-size: calc(0.866*var(--s)) var(--s);
}
</style>