<template>
  <div class="not-found">
    <div class="not-found-content">
      <div class="not-found-number">404</div>
      <div class="not-found-text">
        <h2>页面不存在</h2>
        <p>抱歉，您访问的页面不存在</p>
      </div>
      <div class="not-found-actions">
        <el-button type="primary" @click="goHome">
          返回首页
        </el-button>
        <el-button @click="goBack">
          返回上页
        </el-button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'

const router = useRouter()

const goHome = () => {
  router.push({ name: 'Dashboard' })
}

const goBack = () => {
  router.go(-1)
}
</script>

<style scoped>
.not-found {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
  text-align: center;
}

.not-found-content {
  max-width: 400px;
}

.not-found-number {
  font-size: 120px;
  font-weight: bold;
  color: #ddd;
  line-height: 1;
  margin-bottom: 20px;
}

.not-found-text h2 {
  font-size: 24px;
  color: #303133;
  margin: 0 0 10px;
}

.not-found-text p {
  font-size: 16px;
  color: #909399;
  margin: 0 0 30px;
}

.not-found-actions {
  display: flex;
  gap: 16px;
  justify-content: center;
}
</style>