<template>
  <div>
    <Toolbar />
    <Editor />
  </div>
</template>

<script lang="ts">
import Toolbar from './components/Toolbar.vue';
import Editor from './components/Editor.vue';

export default {
  name: 'App',
  components: { Toolbar, Editor }
};
</script>

<style>
#app {
  display: flex;
  flex-direction: column;
  height: 100vh;
  width: 100vw;
  overflow: hidden;
  font-family: 'Fira Code', monospace;
  background-color: #1e1e1e;
  color: #f0f0f0;
}
</style>
