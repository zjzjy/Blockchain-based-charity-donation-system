'use strict';

const express = require('express');
const router = express.Router();
const donorController = require('../controllers/donorController');

// 注册捐赠者
router.post('/', donorController.registerDonor);

// 验证捐赠者KYC状态
router.put('/:donorId/verify', donorController.verifyDonor);

// 获取捐赠者信息
router.get('/:donorId', donorController.getDonor);

module.exports = router; 