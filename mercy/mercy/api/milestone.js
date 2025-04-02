'use strict';

const express = require('express');
const router = express.Router();
const { Gateway, Wallets } = require('fabric-network');
const path = require('path');
const fs = require('fs');

// 更新里程碑状态
router.put('/:projectId/:milestoneId', async (req, res) => {
    try {
        const { projectId, milestoneId } = req.params;
        const { isCompleted, completionDate } = req.body;

        if (isCompleted === undefined) {
            return res.status(400).json({
                success: false,
                message: '完成状态是必填的'
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
        const contract = network.getContract('projectContract');

        // 更新里程碑
        const result = await contract.submitTransaction(
            'updateMilestone',
            projectId,
            milestoneId,
            isCompleted.toString(),
            completionDate || ''
        );
        
        // 断开连接
        await gateway.disconnect();

        return res.status(200).json({
            success: true,
            message: `里程碑状态已更新为${isCompleted ? '已完成' : '未完成'}`,
            data: JSON.parse(result.toString())
        });
    } catch (error) {
        console.error(`更新里程碑状态失败: ${error}`);
        return res.status(500).json({
            success: false,
            message: `更新失败: ${error.message}`
        });
    }
});

// 获取项目的所有里程碑
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
        const contract = network.getContract('projectContract');

        // 查询项目
        const result = await contract.evaluateTransaction('queryProject', projectId);
        const project = JSON.parse(result.toString());
        
        // 断开连接
        await gateway.disconnect();

        return res.status(200).json({
            success: true,
            data: project.milestones || []
        });
    } catch (error) {
        console.error(`查询项目里程碑失败: ${error}`);
        return res.status(500).json({
            success: false,
            message: `查询失败: ${error.message}`
        });
    }
});

// 获取里程碑详情
router.get('/:projectId/:milestoneId', async (req, res) => {
    try {
        const { projectId, milestoneId } = req.params;

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
        const contract = network.getContract('projectContract');

        // 查询项目
        const result = await contract.evaluateTransaction('queryProject', projectId);
        const project = JSON.parse(result.toString());
        
        // 查找特定里程碑
        const milestone = project.milestones.find(m => m.milestoneId === milestoneId);
        
        // 断开连接
        await gateway.disconnect();

        if (!milestone) {
            return res.status(404).json({
                success: false,
                message: `未找到里程碑 ${milestoneId}`
            });
        }

        return res.status(200).json({
            success: true,
            data: milestone
        });
    } catch (error) {
        console.error(`查询里程碑详情失败: ${error}`);
        return res.status(500).json({
            success: false,
            message: `查询失败: ${error.message}`
        });
    }
});

module.exports = router; 