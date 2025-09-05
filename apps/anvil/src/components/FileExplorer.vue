<script setup lang="ts">
import { ref } from "vue";
import { openFolder, readFile } from "../services/tauri";

const files = ref<string[]>([]);
const selectedFile = ref<string | null>(null);
const fileContent = ref<string>("");

async function handleOpenFolder() {
  files.value = await openFolder();
}

async function handleOpenFile(path: string) {
  selectedFile.value = path;
  fileContent.value = await readFile(path);
}
</script>

<template>
  <div class="p-4">
    <button @click="handleOpenFolder" class="px-4 py-2 bg-blue-500 text-white rounded">
      Open Folder
    </button>

    <ul v-if="files.length" class="mt-4">
      <li
        v-for="file in files"
        :key="file"
        @click="handleOpenFile(file)"
        class="cursor-pointer hover:underline"
      >
        {{ file }}
      </li>
    </ul>

    <pre v-if="fileContent" class="mt-4 bg-gray-100 p-2">{{ fileContent }}</pre>
  </div>
</template>
