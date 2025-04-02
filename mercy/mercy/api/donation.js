'use strict';

const express = require('express');
const router = express.Router();
const { Gateway, Wallets } = require('fabric-network');
const path = require('path');
const fs = require('fs');

// 创建捐赠
router.post('/', async (req, res) => {
    try {
        const { donorId, projectId, amount } = req.body;

        // 验证必填字段
        if (!donorId || !projectId || !amount) {
            return res.status(400).json({
                success: false,
                message: '捐赠者ID、项目ID和金额都是必填的'
            });
        }

        // 连接到网络
        const walletPath = path.join(process.cwd(), 'wallet');
        const wallet = await Wallets.newFileSystemWallet(walletPath);
        const userExists = await wallet.exists('user1');
        if (!userExists) {
            return res.status(401).json({ error: '用户不存在' });
        }

        const connectionPath = path.resolve(process.cwd(), 'config', 'connection.json');
        const ccp = JSON.parse(fs.readFileSync(connectionPath, 'utf8'));

        const gateway = new Gateway();
        await gateway.connect(ccp, { 
            wallet, 
            identity: 'user1', 
            discovery: { enabled: true, asLocalhost: true } 
        });

        // 获取网络和合约
        const network = await gateway.getNetwork('mercychannel');
        const donationContract = network.getContract('donationContract');

        // 创建捐赠
        const result = await donationContract.submitTransaction(
            'createDonation', 
            donorId, 
            projectId, 
            amount.toString()
        );
        
        // 断开连接
        await gateway.disconnect();

        // 返回成功响应
        return res.status(201).json({
            success: true,
            message: '捐赠创建成功',
            data: JSON.parse(result.toString())
        });
    } catch (error) {
        console.error(`捐赠创建失败: ${error}`);
        return res.status(500).json({
            success: false,
            message: `创建失败: ${error.message}`
        });
    }
});

// 获取捐赠者的捐赠历史
router.get('/history/:donorId', async (req, res) => {
    try {
        const { donorId } = req.params;

        // 连接到网络
        const walletPath = path.join(process.cwd(), 'wallet');
        const wallet = await Wallets.newFileSystemWallet(walletPath);
        const userExists = await wallet.exists('user1');
        if (!userExists) {
            return res.status(401).json({ error: '用户不存在' });
        }

        const connectionPath = path.resolve(process.cwd(), 'config', 'connection.json');
        const ccp = JSON.parse(fs.readFileSync(connectionPath, 'utf8'));

        const gateway = new Gateway();
        await gateway.connect(ccp, { 
            wallet, 
            identity: 'user1', 
            discovery: { enabled: true, asLocalhost: true } 
        });

        // 获取网络和合约
        const network = await gateway.getNetwork('mercychannel');
        const donationContract = network.getContract('donationContract');

        // 查询捐赠历史
        const result = await donationContract.evaluateTransaction('getDonationsByDonor', donorId);
        
        // 断开连接
        await gateway.disconnect();

        return res.status(200).json({
            success: true,
            data: JSON.parse(result.toString())
        });
    } catch (error) {
        console.error(`查询捐赠历史失败: ${error}`);
        return res.status(500).json({
            success: false,
            message: `查询失败: ${error.message}`
        });
    }
});

// 获取项目的捐赠历史
router.get('/project/:projectId', async (req, res) => {
    try {
        const { projectId } = req.params;

        // 连接到网络
        const walletPath = path.join(process.cwd(), 'wallet');
        const wallet = await Wallets.newFileSystemWallet(walletPath);
        const userExists = await wallet.exists('user1');
        if (!userExists) {
            return res.status(401).json({ error: '用户不存在' });
        }

        const connectionPath = path.resolve(process.cwd(), 'config', 'connection.json');
        const ccp = JSON.parse(fs.readFileSync(connectionPath, 'utf8'));

        const gateway = new Gateway();
        await gateway.connect(ccp, { 
            wallet, 
            identity: 'user1', 
            discovery: { enabled: true, asLocalhost: true } 
        });

        // 获取网络和合约
        const network = await gateway.getNetwork('mercychannel');
        const donationContract = network.getContract('donationContract');

        // 查询项目捐赠历史
        const result = await donationContract.evaluateTransaction('getDonationsByProject', projectId);
        
        // 断开连接
        await gateway.disconnect();

        return res.status(200).json({
            success: true,
            data: JSON.parse(result.toString())
        });
    } catch (error) {
        console.error(`查询项目捐赠历史失败: ${error}`);
        return res.status(500).json({
            success: false,
            message: `查询失败: ${error.message}`
        });
    }
});

// 分配资金到里程碑
router.post('/allocate', async (req, res) => {
    try {
        const { projectId, milestoneId, amount } = req.body;

        // 验证必填字段
        if (!projectId || !milestoneId || !amount) {
            return res.status(400).json({
                success: false,
                message: '项目ID、里程碑ID和金额都是必填的'
            });
        }

        // 连接到网络
        const walletPath = path.join(process.cwd(), 'wallet');
        const wallet = await Wallets.newFileSystemWallet(walletPath);
        const adminExists = await wallet.exists('admin');
        if (!adminExists) {
            return res.status(401).json({ error: '管理员用户不存在' });
        }

        const connectionPath = path.resolve(process.cwd(), 'config', 'connection.json');
        const ccp = JSON.parse(fs.readFileSync(connectionPath, 'utf8'));

        const gateway = new Gateway();
        await gateway.connect(ccp, { 
            wallet, 
            identity: 'admin', 
            discovery: { enabled: true, asLocalhost: true } 
        });

        // 获取网络和合约
        const network = await gateway.getNetwork('mercychannel');
        const projectContract = network.getContract('projectContract');

        // 分配资金到里程碑
        const result = await projectContract.submitTransaction(
            'allocateFundsToMilestone',
            projectId,
            milestoneId,
            amount.toString()
        );
        
        // 断开连接
        await gateway.disconnect();

        return res.status(200).json({
            success: true,
            message: '资金分配成功',
            data: JSON.parse(result.toString())
        });
    } catch (error) {
        console.error(`资金分配失败: ${error}`);
        return res.status(500).json({
            success: false,
            message: `分配失败: ${error.message}`
        });
    }
});

module.exports = router; 