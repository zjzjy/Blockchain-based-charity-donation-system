'use strict';

const express = require('express');
const router = express.Router();
const projectController = require('../controllers/projectController');

// 创建项目
router.post('/', projectController.createProject);

// 获取项目信息
router.get('/:projectId', projectController.getProject);

// 获取项目列表
router.get('/', projectController.getProjects);

// 更新项目状态
router.put('/:projectId/status', projectController.updateProjectStatus);

// 添加里程碑
router.post('/:projectId/milestone', projectController.addMilestone);

module.exports = router; 