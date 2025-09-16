<template>
  <div id="app">
    <router-view />
  </div>
</template>

<script setup>
// 全局样式和应用初始化
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
