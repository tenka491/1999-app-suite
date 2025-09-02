<template>
  <textarea v-model="content" class="editor"></textarea>
</template>

<script lang="ts">
import { ref } from 'vue';
export default {
  name: 'Editor',
  setup() {
    const content = ref('');
    return { content };
  }
}
</script>

<style scoped>
.editor {
  flex: 1;
  width: 100%;
  padding: 10px;
  background-color: #1e1e1e;
  color: #f0f0f0;
  border: none;
  font-family: 'Fira Code', monospace;
  font-size: 14px;
  resize: none;
}
</style>
