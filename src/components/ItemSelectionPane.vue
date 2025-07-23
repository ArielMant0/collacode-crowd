<template>
    <div class="pa-2" style="max-width: 1300px;">

        <v-card v-if="app.cwId" rounded="lg" color="error" class="mt-2 mb-4" title="Attention" density="compact">
            <v-card-text>
                Crowd workers can only do up to 3 {{ app.itemName }}s.
                After 3 {{ app.itemName }}s, other {{ app.itemName }}s can longer longer be completed
            </v-card-text>
        </v-card>

        <v-card rounded="lg" class="panel panel-yes text-teal-darken-4">
            <v-card-title style="font-weight: 400;" class="bitcount-prop-double">
                Available {{ app.itemNameCaptial }}s
            </v-card-title>
            <v-card-text class="d-flex flex-wrap justify-center">
                <v-sheet v-for="item in available" rounded="lg" color="surface" class="pa-2 mr-3 mb-3" elevation="2">
                    <ItemProgress :value="itemCounts[item.id]" :target="countTarget"/>
                    <ItemTeaser :item="item" @click="chooseItem(item)"/>
                </v-sheet>
            </v-card-text>
        </v-card>

        <v-card rounded="lg" class="panel panel-done mt-8 text-deep-purple-darken-2">
            <v-card-title style="font-weight: 400;" class="bitcount-prop-double">
                Completed {{ app.itemNameCaptial }}s
            </v-card-title>
            <v-card-text class="d-flex flex-wrap justify-center">
                <v-sheet v-for="item in done" rounded="lg" color="surface" class="pa-2 mr-3 mb-3" elevation="2">
                    <ItemProgress :value="itemCounts[item.id]" :target="countTarget"/>
                    <ItemTeaser :item="item" hide-overlay prevent-click style="opacity: 0.33"/>
                </v-sheet>
            </v-card-text>
        </v-card>

        <v-card v-if="app.cwId" rounded="lg" class="panel panel-no mt-8 text-error">
            <v-card-title style="font-weight: 400;" class="bitcount-prop-double">
                Other {{ app.itemNameCaptial }}s
            </v-card-title>
            <v-card-text class="d-flex flex-wrap justify-center">
                <v-sheet v-for="item in gone" rounded="lg" color="surface" class="pa-2 mr-3 mb-3" elevation="2">
                    <ItemProgress :value="itemCounts[item.id]" :target="countTarget"/>
                    <ItemTeaser :item="item" hide-overlay prevent-click style="opacity: 0.33"/>
                </v-sheet>
            </v-card-text>
        </v-card>
    </div>
</template>

<script setup>
    import DM from '@/use/data-manager';
    import { useApp } from '@/stores/app';
    import { onMounted, ref, watch } from 'vue';
    import ItemTeaser from './items/ItemTeaser.vue';
    import router from '@/router';
    import { useTimes } from '@/stores/times';
    import ItemProgress from './items/ItemProgress.vue';
    import { storeToRefs } from 'pinia';

    const app = useApp()
    const times = useTimes()

    const { itemCounts } = storeToRefs(app)

    const available = ref([])
    const done = ref([])
    const gone = ref([])

    const countTarget = 6

    function chooseItem(item) {
        if (item._done) return
        app.setTarget(item)
        router.push('/similarity_game')
    }
    function read() {
        available.value = DM.getDataBy("items", d => app.itemsLeft.has(d.id))
        done.value = DM.getDataBy("items", d => app.itemsDone.has(d.id))
        gone.value = DM.getDataBy("items", d => app.itemsGone.has(d.id))
    }

    onMounted(read)

    watch(() => Math.max(times.all, times.crowd), read)
</script>

<style scoped>
.panel {
    text-align: center;
    /* backdrop-filter: blur(8px); */
}
.panel-yes {
  --s: 300px; /* control the size*/
  --c1: #94b4b1;
  --c2: #acc4c5;
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
  --s: 300px; /* control the size*/
  --c1: #b6accf;
  --c2: #cbc3da;
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
  --s: 300px; /* control the size*/
  --c1: #cfacac;
  --c2: #dac3c3;
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