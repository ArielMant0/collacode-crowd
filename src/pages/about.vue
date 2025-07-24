<template>
    <section class="pa-4 mt-4 d-flex justify-center" style="width: 100%;">
        <div :style="{ maxWidth: maxWidth }">
            <v-sheet rounded="lg" elevation="4" class="pa-4 art-panel" style="border: 2px solid #428775" color="#42877544">
                <article>
                    <h2 style="color: #428775;">Background</h2>
                    <p>
                        We are building a database that describes video games with a large hierarchy of tags.
                        These tags and how they are given to different games is curated by a handful of experts,
                        but we want to extend and validate it with the help of other gaming enthusiast!
                    </p>
                </article>
            </v-sheet>
            <v-sheet rounded="lg" elevation="4" class="pa-4 art-panel" style="border: 2px solid #6f51a6" color="#6f51a644">
                <article>
                    <h2 style="color: #6f51a6;">Goal</h2>
                    <p>
                        To support our experts during tagging and help them extend the database, we are gathering <b>similarity judgements</b>
                        from other gaming enthusiasts, so that we can build a large graph of which video games are <b>how</b> similar to each other.
                    </p>
                </article>
            </v-sheet>
            <v-sheet rounded="lg" elevation="4" class="pa-4 art-panel" style="border: 2px solid #b56251" color="#b5625144">
                <article>
                    <h2 style="color: #b56251;">How it works</h2>
                    <p>
                        For each game in our database, you can complete 1 of 2 different game-like activities, where we use our exisingt data to help you find similar games.
                        Doing this should take 2-3 minutes per game, and you can do it for as many or as few games as you like.
                        If you do at least 5 games, you get to explore how the similarity graph looks like so far here (TODO).
                    </p>
                </article>
            </v-sheet>
        </div>
    </section>
</template>

<script setup>
    import { useDisplay } from 'vuetify'

    const { mdAndDown, lgAndDown, xlAndDown } = useDisplay()
    const maxWidth = computed(() => {
        if (xlAndDown.value) {
            return "1200px"
        } else if (lgAndDown.value) {
            return "1000px"
        } else if (mdAndDown.value) {
            return "90%"
        }
        return "95%"
    })
</script>

<style scoped>
h1, h2 {
    text-align: center;
    margin-bottom: 1em;
    text-transform: uppercase;
}
article {
    text-align: justify;
}
.art-panel {
    margin: 3em 0em;
}
</style>