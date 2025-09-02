<template>
  <div class="toolbar">
    <button @click="newFile">New</button>
    <button @click="openFile">Open</button>
    <button @click="saveFile">Save</button>
  </div>
</template>

<script lang="ts">
export default {
  name: 'Toolbar',
  methods: {
    newFile() { console.log('New file'); },
    openFile() { console.log('Open file'); },
    saveFile() { console.log('Save file'); }
  }
}
</script>

<style scoped>
.toolbar {
  display: flex;
  gap: 10px;
  padding: 10px;
  background-color: #2e2e2e;
}
button {
  background: #3e3e3e;
  border: none;
  color: white;
  padding: 5px 10px;
  cursor: pointer;
}
button:hover {
  background: #505050;
}
</style>
