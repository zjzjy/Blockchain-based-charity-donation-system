'use strict';

const express = require('express');
const router = express.Router();
const donationController = require('../controllers/donationController');

// 创建捐赠
router.post('/', donationController.createDonation);

// 获取捐赠者的捐赠历史
router.get('/donor/:donorId', donationController.getDonationsByDonor);

// 获取项目的捐赠历史
router.get('/project/:projectId', donationController.getDonationsByProject);

// 分配资金到里程碑
router.post('/allocate', donationController.allocateFunds);

module.exports = router; 