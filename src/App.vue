<template>
  <nav class="level">
    <p class="level-item has-text-centered">
      <img src="@/assets/logo.png" style="height: 48px" class="my-2" />
    </p>
  </nav>
  <div class="container mt-4">
    <div class="content">
      <RouterView />
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";

export default defineComponent({});
</script>

<style></style>
