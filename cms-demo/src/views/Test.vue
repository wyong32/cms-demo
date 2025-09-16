<template>
  <div style="padding: 20px;">
    <h1>测试页面</h1>
    <p>如果你能看到这个页面，说明路由系统正常工作</p>
    <el-button type="primary" @click="testClick">测试按钮</el-button>
  </div>
</template>

<script setup>
import { ElMessage } from 'element-plus'

const testClick = () => {
  ElMessage.success('按钮点击成功！')
}
</script>
