<template>
    <div class="pa-2">
        <LinCombGame v-if="validMethod" :method="method" @close="onClose" @end="onEnd"/>
    </div>
</template>

<script setup>
    import LinCombGame from '@/components/LinCombGame.vue';
    import router from '@/router';
    import { useApp } from '@/stores/app';
    import { useTimes } from '@/stores/times';
    import { randomInteger } from '@/use/random';
    import { computed, onMounted } from 'vue';
    import { useToast } from 'vue-toastification';

    const app = useApp()
    const times = useTimes()
    const toast = useToast()

    const method = ref(0)
    const validMethod = computed(() => method.value === 1 || method.value === 2)

    function onEnd() {
        app.completedTarget()
        times.needsReload("crowd")
    }
    function onClose() {
        router.push("/")
    }
    function read() {
        switch (app.method) {
            case 0:
                method.value = randomInteger(1, 2)
                break
            case 1:
            case 2:
                method.value = app.method
                break
            default:
                toast.error("invalid method")
                method.value = 0
        }
    }

    onMounted(read)
</script>
