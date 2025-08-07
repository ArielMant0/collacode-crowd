<template>
    <v-sheet
        style="font-size: x-large;"
        class="pt-3 pb-3 pr-6 pl-6 d-flex align-center timer"
        rounded
        :color="bgColor">
        <v-icon class="mr-1" :class="secondsLeft < critical ? 'wobble-fast' : ''">{{ icon }}</v-icon>
        {{ secondsLeft > 0 ? timer.toFormat("mm:ss") : "--:--" }}
    </v-sheet>
</template>

<script setup>
    import { DateTime } from 'luxon';
    import { SOUND, useSounds } from '@/stores/sounds';
    import { computed, onBeforeUnmount } from 'vue';

    const sounds = useSounds()

    const props = defineProps({
        timeInSec: {
            type: Number,
            default: 60
        },
        criticalColor: {
            type: String,
            default: "error"
        },
        warningColor: {
            type: String,
            default: "warning"
        },
        color: {
            type: String,
            default: "surface-light"
        },
        icon: {
            type: String,
            default: "mdi-alarm"
        },
        showCritical: {
            type: Boolean,
            default: true
        },
        critical: {
            type: Number,
            default: 10
        },
        showWarning: {
            type: Boolean,
            default: true
        },
        warning: {
            type: Number,
            default: 30
        },
        notice: {
            type: Number,
            default: 10
        },
    })
    const emit = defineEmits(["start", "pause", "stop", "end"])

    const timeEnd = ref(DateTime.local())
    const timer = ref(DateTime.local())

    const secondsLeft = computed(() => timer.value.minutes*60 + timer.value.seconds)
    const bgColor = computed(() => {
        if (props.showCritical && secondsLeft.value < props.critical) {
            return props.criticalColor
        }
        if (props.showWarning && secondsLeft.value < props.warning) {
            return props.warningColor
        }
        return props.color
    })

    let int = null, lastSecond = props.timeInSec

    let lastPauseSecs = 0

    function tick() {
        timer.value = timeEnd.value.diffNow(["minutes", "seconds"])
        const s = Math.floor(secondsLeft.value)

        if (secondsLeft.value <= 0) {
            sounds.stop(SOUND.TICK, false)
            stop("end")
            return
        }

        if (s === props.notice && s < lastSecond) {
            // play a tick sound for critical seconds
            sounds.play(SOUND.OBACHT, false)
        } else if (secondsLeft.value <= props.critical && s < lastSecond) {
            // play a tick sound for critical seconds
            sounds.play(SOUND.TICK, false)
        }

        // emit tick when seconds change
        if (s < lastSecond) {
            lastSecond = s;
        }
        int = requestAnimationFrame(tick)
    }
    function start() {
        clear()
        timeEnd.value = DateTime.local().plus({ seconds: props.timeInSec })
        timer.value = timeEnd.value.diffNow(["minutes", "seconds"])
        lastSecond = Math.floor(secondsLeft.value)
        int = requestAnimationFrame(tick)
        emit("start", lastSecond)
    }
    function togglePause() {
        if (int === null) {
            unpause()
        } else {
            pause()
        }
    }
    function pause() {
        timer.value = timeEnd.value.diffNow(["minutes", "seconds"])
        lastPauseSecs = Math.floor(secondsLeft.value)
        clear()
        emit("pause", lastPauseSecs)
    }
    function unpause() {
        clear()
        timeEnd.value = DateTime.local().plus({ seconds: lastPauseSecs })
        timer.value = timeEnd.value.diffNow(["minutes", "seconds"])
        lastPauseSecs = Math.floor(secondsLeft.value)
        int = requestAnimationFrame(tick)
        emit("pause", lastPauseSecs)
    }
    function stop(name="stop") {
        timer.value = timeEnd.value.diffNow(["minutes", "seconds"])
        lastSecond = Math.floor(secondsLeft.value)
        clear()
        if (name) {
            emit(name, lastSecond)
        }
    }
    function clear() {
        if (int !== null) {
            cancelAnimationFrame(int)
            int = null;
        }
    }

    onBeforeUnmount(clear)

    defineExpose({ start, pause, unpause, togglePause, stop })

</script>

<style scoped>
.wobble-fast {
  animation: wobble 300ms ease-in-out infinite;
}</style>