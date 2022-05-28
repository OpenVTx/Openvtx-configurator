import { createRouter, createWebHistory } from "vue-router";
import FlashView from "@/views/FlashView.vue";

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: "/",
      name: "flash",
      component: FlashView,
    },
  ],
});

export default router;
