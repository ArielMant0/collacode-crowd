<template>
    <div class="d-flex justify-center">

        <div style="position: fixed; top: 45px; left: 10px;">
            <div>
                <v-btn href="#sec1" :variant="inSection === 1 ? 'flat' : 'outlined'" block color="#428775">background</v-btn>
            </div>
            <div class="mt-2 mb-2">
                <v-btn href="#sec2" :variant="inSection === 2 ? 'flat' : 'outlined'" block color="#6f51a6">goal</v-btn>
            </div>
            <div>
                <v-btn href="#sec3" :variant="inSection === 3 ? 'flat' : 'outlined'" block color="#b56251">how it works</v-btn>
            </div>
        </div>
        <section class="pa-4 mt-4" style="min-width: 300px; width: 75%; max-width: 1000px">

            <div :style="{ maxWidth: maxWidth }">
                <v-sheet id="sec1" ref="sec1" rounded="lg" elevation="4" class="pa-2 art-panel" style="border: 2px solid #428775" color="#42877522">
                    <div style="color: #428775; font-size: 40px; text-align: center;" class="bitcount-prop-double">Background</div>
                </v-sheet>
                <article>
                    <p>
                        We are building a database that <b>describes video games</b> with a large hierarchy of tags.
                        These tags are curated by a handful of experts, but we want to <b>extend</b> and <b>validate</b> this database with the help of other games enthusiast!
                    </p>
                    <div style="text-align: center;" class="text-caption">
                        <figure>
                            <img :src="a1" class="mt-1" style="max-width: 70%;"/>
                            <figcaption>
                                Here's an overview of the {{ app.itemName }}s in our database so far!
                            </figcaption>
                        </figure>
                    </div>
                </article>

                <v-sheet id="sec2" ref="sec2" rounded="lg" elevation="4" class="pa-2 art-panel" style="border: 2px solid #6f51a6" color="#6f51a622">
                    <div style="color: #6f51a6; font-size: 40px; text-align: center;" class="bitcount-prop-double">Goal</div>
                </v-sheet>
                <article>
                    <p>
                        To support our experts during tagging and help them extend the database, we are gathering <b>similarity judgements</b>
                        from others who are knowledgeable about games, so that we can build a large graph of which video games are <b>how</b> similar to each other.
                    </p>
                    <div style="text-align: center;" class="text-caption">
                        <figure>
                            <img :src="a2" class="mt-1" style="max-width: 70%;"/>
                            <figcaption>
                                This is what the similarity graph could look like.
                            </figcaption>
                        </figure>
                    </div>
                </article>

                <v-sheet id="sec3" ref="sec3" rounded="lg" elevation="4" class="pa-2 art-panel" style="border: 2px solid #b56251" color="#b5625122">
                    <div style="color: #b56251; font-size: 40px; text-align: center;" class="bitcount-prop-double">How it Works</div>
                </v-sheet>

                <article>
                    <p>
                        For each game in our database, you can complete one of two different game-like activities, where we use our existing data to help you find <b>similar games</b>.
                        Doing this should take 3-8 minutes per game, depending on how familiar you are with many games.
                        You can do it for as many or as few games as you like, it's up to you.
                        If you do <b>at least 5 games</b>, you get to explore how the similarity graph looks like so far in the <a href="graph">graph view</a>.
                    </p>
                    <v-divider class="mt-3 mb-3" color="#b56251" opacity="1"></v-divider>
                    <div>
                        <p>
                            Here's a detailed explanation of how the different steps work. Each step has a time limit shown at the top of the page; keep that in mind. First, you have to answer 3 questions to test if you are familiar with the {{ app.itemName }} you chose. You have to answer at least 2 questions correctly, otherwise this {{ app.itemName }} will be blocked for you.
                        </p>
                        <div style="text-align: center;" class="text-caption">
                            <img :src="w1" class="mt-1" style="max-width: 30%;"/>
                        </div>
                    </div>
                    <v-divider class="mt-3 mb-3" color="#b56251" opacity="1"></v-divider>
                    <div>
                        <p>
                            Next, you will get one of two possible activities, which we alternate between.
                            Each activity includes a tutorial if you do it the first time.
                            The goal is always the same: helping you find {{ app.itemName }}s from our database that are similar to the target {{ app.itemName }} you chose.
                            In the first activity (left), you can browse through different groups of {{ app.itemName }}s to find similarity candidates.
                            In the second activity (right), you answer different questions about the {{ app.itemName }} to narrow you pool of candidates down to a reasonable number.
                        </p>
                        <div class="mt-1 d-flex justify-center text-caption" style="text-align: center;">
                                <figure class="mr-1" style="max-width: 49%;">
                                <img :src="w21" style="max-width: 100%;"/>
                                <figcaption>Activity 1</figcaption>
                            </figure>
                            <figure class="ml-1" style="max-width: 49%;">
                                <img :src="w22" style="max-width: 100%;"/>
                                <figcaption>Activity 2</figcaption>
                            </figure>
                        </div>
                    </div>
                    <v-divider class="mt-3 mb-3" color="#b56251" opacity="1"></v-divider>
                    <div>
                        In between, you will be asked to complete an attention check where you have to pick the correctly colored shape. It's really simple, we just want to make sure you're still awake.
                        <div style="text-align: center;" class="text-caption">
                            <figure>
                                <img :src="wa" class="mt-1" style="max-width: 80%;"/>
                                <figcaption>Example attention check</figcaption>
                            </figure>
                        </div>
                    </div>
                    <v-divider class="mt-3 mb-3" color="#b56251" opacity="1"></v-divider>
                    <div>
                        After the activity, you have to choose similar {{ app.itemName }}s from your list of candidates.
                        These should be assigned to one of two categories: <b>similar</b> or <b>very similar</b>.
                        Only put {{ app.itemName }}s here where you feel confident that they are similar.
                        <div style="text-align: center;" class="text-caption">
                            <figure>
                                <img :src="w3" class="mt-1" style="max-width: 80%;"/>
                                <figcaption>
                                    The list of candidates is on the left and you can assign {{ app.itemName }}s to the categories on the right by dragging the images there. You don't have to assign any {{ app.itemName }}s if none of them fit your target. Click on <b>next step</b> when you're done.
                                </figcaption>
                            </figure>
                        </div>
                    </div>
                    <v-divider class="mt-3 mb-3" color="#b56251" opacity="1"></v-divider>
                    <div>
                        Then you are almost done. In the last step, you get another opportunity to add more {{ app.itemName }}s to your two categories. We suggest some titles with similar names, but you can search for titles yourself.
                        We also show you additional {{ app.itemName }}s already picked by others who have added similarities for the same {{ app.itemName }}.
                        <div style="text-align: center;" class="text-caption">
                            <figure>
                                <img :src="w4" class="mt-1" style="max-width: 80%;"/>
                                <figcaption>
                                    This step is very similar to the one before. To add more {{ app.itemName }}s that are <b>similar</b> or <b>very similar</b> to your target, drag them into the corresponding box. Click on <b>next step</b> when you're done.
                                </figcaption>
                            </figure>
                        </div>
                    </div>
                    <v-divider class="mt-3 mb-3" color="#b56251" opacity="1"></v-divider>
                    <div>
                        Now you're done and can review the similar {{ app.itemName }}s for your target if you wish.
                        <div style="text-align: center;" class="text-caption">
                            <img :src="w5" class="mt-1" style="max-width: 80%;"/>
                        </div>
                    </div>
                </article>
            </div>
        </section>
    </div>
</template>

<script setup>
    import { useApp } from '@/stores/app'
    import { useDisplay } from 'vuetify'
    import a1 from '@/assets/about-game-grid.jpg'
    import a2 from '@/assets/about-graph-example.jpg'
    import w1 from '@/assets/about-workflow-1.jpg'
    import w21 from '@/assets/about-workflow-2-1.jpg'
    import w22 from '@/assets/about-workflow-2-2.jpg'
    import w3 from '@/assets/about-workflow-3.jpg'
    import w4 from '@/assets/about-workflow-4.jpg'
    import w5 from '@/assets/about-workflow-5.jpg'
    import wa from '@/assets/about-workflow-attention.jpg'
    import { computed, useTemplateRef } from 'vue'
    import { useElementVisibility } from '@vueuse/core'

    const app = useApp()

    const sec1 = useTemplateRef("sec1")
    const sec2 = useTemplateRef("sec2")

    const visible1 = useElementVisibility(sec1)
    const visible2 = useElementVisibility(sec2)

    const inSection = computed(() => {
        if (visible1.value) {
            return 1
        } else if (visible2.value) {
            return 2
        }
        return 3
    })

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
    margin-top: 3em;
    margin-bottom: 1.5em;
}
</style>