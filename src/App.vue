<template>
  <n-config-provider>
    <n-layout>
      <n-layout-header bordered>
        <img class="logo" src="@/assets/logo.png" />
      </n-layout-header>
      <n-layout-content>
        <RouterView />
      </n-layout-content>
    </n-layout>
  </n-config-provider>
</template>

<script lang="ts">
import {
  NConfigProvider,
  NLayout,
  NLayoutContent,
  NLayoutHeader,
} from "naive-ui";
import { defineComponent } from "vue";

export default defineComponent({
  components: {
    NConfigProvider,
    NLayout,
    NLayoutHeader,
    NLayoutContent,
  },
});
</script>

<style>
.n-layout-header,
.n-layout-footer {
  padding: 0px 18px;
}
.n-layout-content {
  padding: 0px 24px;
}
.logo {
  height: 48px;
}
</style>
