<template>
  <main class="app">
    <Timer />
    <p>{{appName}} v{{ appVersion }}</p>
  </main>
</template>

<script setup lang="ts">
import Timer from './components/Timer.vue'
import { isPermissionGranted, requestPermission, sendNotification } from '@tauri-apps/plugin-notification';
import { onMounted, ref } from 'vue';
import { app } from '@tauri-apps/api';

const appVersion = ref("");
const appName = ref("");

async function initNotifications() {
  let permissionGranted = await isPermissionGranted();
  if (!permissionGranted) {
    const permission = await requestPermission();
    permissionGranted = permission === 'granted';
  }
  return permissionGranted;
}
onMounted(async () => {
  const granted = await initNotifications();
  if (granted) {
    await sendNotification({ title: "Hello!", body: "Notifications are working 🎉" });
  } else {
    await requestPermission();
  }

  appVersion.value = await app.getVersion();
  appName.value = await app.getName();
});

// import { onMounted } from "vue";
// import { sendNotification } from "@tauri-apps/plugin-notification";

// onMounted(async () => {
//   try {
//     await sendNotification({ title: "Pomodoro Test", body: "Does this show up?" });
//   } catch (e) {
//     console.error("Notification failed", e);
//   }
// });
</script>

<style lang="scss">
body {
  margin: 0;
  background: #0b0c10;
  font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Inter, "Helvetica Neue", Arial, "Apple Color Emoji", "Segoe UI Emoji";
}

.app {
  min-height: 100vh;
}
</style>
