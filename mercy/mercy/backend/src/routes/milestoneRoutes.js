'use strict';

const express = require('express');
const router = express.Router();
const milestoneController = require('../controllers/milestoneController');

// 更新里程碑状态
router.put('/:projectId/:milestoneId', milestoneController.updateMilestone);

// 获取项目的所有里程碑
router.get('/project/:projectId', milestoneController.getMilestonesByProject);

// 获取里程碑详情
router.get('/:projectId/:milestoneId', milestoneController.getMilestone);

module.exports = router; 