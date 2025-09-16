<template>
  <div id="app">
    <div v-if="showDebug" style="position: fixed; top: 10px; right: 10px; background: #f0f0f0; padding: 10px; border-radius: 5px; font-size: 12px; z-index: 9999;">
      <div>App mounted: {{ appMounted }}</div>
      <div>Router ready: {{ routerReady }}</div>
      <div>Current route: {{ $route.name }}</div>
    </div>
    <router-view />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'

const appMounted = ref(false)
const routerReady = ref(false)
const showDebug = ref(true)
const $route = useRoute()

onMounted(() => {
  appMounted.value = true
  routerReady.value = true
  console.log('🚀 App mounted successfully')
})
</script>

<style>
/* 全局样式重置 */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Helvetica Neue', sans-serif;
  background-color: #f0f2f5;
  color: #303133;
  line-height: 1.5;
}

#app {
  height: 100vh;
  overflow: hidden;
}

/* 滚动条样式 */
::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 3px;
}

::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 3px;
}

::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}

/* Element Plus 样式覆盖 */
.el-card {
  border-radius: 8px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
}

.el-button {
  border-radius: 6px;
}

.el-input__wrapper {
  border-radius: 6px;
}

.el-select .el-input__wrapper {
  border-radius: 6px;
}

.el-table {
  border-radius: 8px;
  overflow: hidden;
}

.el-dialog {
  border-radius: 8px;
}

/* 工具类 */
.text-center {
  text-align: center;
}

.text-right {
  text-align: right;
}

.flex {
  display: flex;
}

.flex-center {
  display: flex;
  align-items: center;
  justify-content: center;
}

.flex-between {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.w-full {
  width: 100%;
}

.h-full {
  height: 100%;
}

.mb-4 {
  margin-bottom: 16px;
}

.mb-8 {
  margin-bottom: 32px;
}

.mt-4 {
  margin-top: 16px;
}

.mt-8 {
  margin-top: 32px;
}

.p-4 {
  padding: 16px;
}

.p-8 {
  padding: 32px;
}

</style>
