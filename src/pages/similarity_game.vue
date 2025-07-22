<template>
    <LinCombGame :method="method" @close="onClose"/>
</template>

<script setup>
    import LinCombGame from '@/components/LinCombGame.vue';
    import router from '@/router';
    import { useApp } from '@/stores/app';
    import { randomInteger } from '@/use/random';
    import { onMounted } from 'vue';

    const app = useApp()

    const method = ref(1)

    function onClose() {
        router.replace("/")
    }
    function read() {
        if (app.method === 1 || app.method === 2) {
            method.value = app.method
        } else {
            method.value = randomInteger(1, 2)
        }
    }

    onMounted(read)
</script>
