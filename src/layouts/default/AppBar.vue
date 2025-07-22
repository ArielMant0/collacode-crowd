<template>
  <v-app-bar flat density="compact" class="pa-0" color="primary">
    <v-app-bar-title>
      <v-icon @click="router.push('/')" class="mr-1">mdi-tag-multiple</v-icon>
      <span class="cursor-pointer" @click="router.push('/')">
        CollaCode Crowd
      </span>
    </v-app-bar-title>
  </v-app-bar>
</template>

<script setup>
  import router from '@/router';

  // yellow: fcd468
  // purple: 7650a1
</script>
