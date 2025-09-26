import axios from 'axios';

const API_BASE_URL = 'http://localhost:3001/api';
let authToken = '';
let testProjectId = '';
let testCategoryId = '';
let testProjectDataId = '';

// 登录获取token
async function login() {
  try {
    const response = await axios.post(`${API_BASE_URL}/auth/login`, {
      username: 'admin',
      password: 'admin123'
    });
    authToken = response.data.token;
    console.log('✅ 登录成功，token:', authToken.substring(0, 20) + '...');
  } catch (error) {
    console.error('❌ 登录失败:', error.message);
    throw error;
  }
}

// 创建测试项目
async function createProject() {
  try {
    const response = await axios.post(`${API_BASE_URL}/projects`, {
      name: '测试项目-分类问题',
      category: '测试分类',
      description: '用于测试分类问题的项目'
    }, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    testProjectId = response.data.project.id;
    console.log('✅ 创建测试项目成功，ID:', testProjectId);
  } catch (error) {
    console.error('❌ 创建项目失败:', error.message);
    throw error;
  }
}

// 创建测试分类
async function createCategory() {
  try {
    const response = await axios.post(`${API_BASE_URL}/categories`, {
      name: '测试分类-分类问题',
      type: '测试类型',
      description: '用于测试分类问题的分类'
    }, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    testCategoryId = response.data.category.id;
    console.log('✅ 创建测试分类成功，ID:', testCategoryId);
  } catch (error) {
    console.error('❌ 创建分类失败:', error.message);
    throw error;
  }
}

// 创建项目数据（带分类）
async function createProjectData() {
  try {
    const response = await axios.post(`${API_BASE_URL}/project-data`, {
      projectId: testProjectId,
      categoryId: testCategoryId,
      data: {
        title: '测试数据-分类问题',
        description: '用于测试分类问题的数据'
      }
    }, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    testProjectDataId = response.data.projectData.id;
    console.log('✅ 创建项目数据成功，ID:', testProjectDataId);
    console.log('📊 创建时的分类ID:', testCategoryId);
  } catch (error) {
    console.error('❌ 创建项目数据失败:', error.message);
    throw error;
  }
}

// 获取项目数据详情
async function getProjectData() {
  try {
    const response = await axios.get(`${API_BASE_URL}/project-data/${testProjectDataId}`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    const projectData = response.data.projectData;
    console.log('🔍 获取的项目数据详情:');
    console.log('  - ID:', projectData.id);
    console.log('  - categoryId:', projectData.categoryId);
    console.log('  - category:', projectData.category);
    console.log('  - data:', projectData.data);
    
    if (projectData.categoryId !== testCategoryId) {
      console.error('❌ 分类ID不匹配！');
      console.error('  期望:', testCategoryId);
      console.error('  实际:', projectData.categoryId);
    } else {
      console.log('✅ 分类ID匹配正确');
    }
    
    return projectData;
  } catch (error) {
    console.error('❌ 获取项目数据失败:', error.message);
    throw error;
  }
}

// 更新项目数据（不修改分类）
async function updateProjectData() {
  try {
    const response = await axios.put(`${API_BASE_URL}/project-data/${testProjectDataId}`, {
      data: {
        title: '测试数据-分类问题-已更新',
        description: '用于测试分类问题的数据-已更新'
      }
    }, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    console.log('✅ 更新项目数据成功');
    return response.data.projectData;
  } catch (error) {
    console.error('❌ 更新项目数据失败:', error.message);
    throw error;
  }
}

// 清理测试数据
async function cleanup() {
  try {
    if (testProjectDataId) {
      await axios.delete(`${API_BASE_URL}/project-data/${testProjectDataId}`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      console.log('🗑️ 删除测试项目数据');
    }
    
    if (testProjectId) {
      await axios.delete(`${API_BASE_URL}/projects/${testProjectId}`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      console.log('🗑️ 删除测试项目');
    }
    
    if (testCategoryId) {
      await axios.delete(`${API_BASE_URL}/categories/${testCategoryId}`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      console.log('🗑️ 删除测试分类');
    }
  } catch (error) {
    console.error('⚠️ 清理失败:', error.message);
  }
}

// 运行测试
async function runTest() {
  console.log('🧪 开始测试分类问题...');
  
  try {
    // 1. 登录
    await login();
    
    // 2. 创建测试数据
    await createProject();
    await createCategory();
    await createProjectData();
    
    // 3. 获取并检查项目数据
    console.log('\n📋 第一次获取项目数据:');
    await getProjectData();
    
    // 4. 更新项目数据
    console.log('\n🔄 更新项目数据...');
    await updateProjectData();
    
    // 5. 再次获取并检查项目数据
    console.log('\n📋 更新后获取项目数据:');
    await getProjectData();
    
    console.log('\n✅ 测试完成！');
    
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    if (error.response) {
      console.error('响应数据:', error.response.data);
    }
  } finally {
    // 清理测试数据
    await cleanup();
  }
}

runTest();


