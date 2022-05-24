import { createApp } from "vue";
import { createPinia } from "pinia";

import "@fortawesome/fontawesome-free/js/all";
import "./assets/base.scss";

import App from "./App.vue";
import router from "./router";

const app = createApp(App);

app.use(createPinia());
app.use(router);

app.mount("#app");
