const express = require('express');
const router = express.Router();
const projectOwnerController = require('../controllers/projectOwnerController');
const auth = require('../middleware/auth');

// 注册项目所有者
router.post('/register', projectOwnerController.registerProjectOwner);

// 获取项目所有者信息
router.get('/:projectOwnerId', auth, projectOwnerController.getProjectOwner);

// 更新项目所有者信息
router.put('/:projectOwnerId', auth, projectOwnerController.updateProjectOwner);

// 获取项目所有者的项目列表
router.get('/:projectOwnerId/projects', auth, projectOwnerController.getProjectOwnerProjects);

module.exports = router; 