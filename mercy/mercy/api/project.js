'use strict';

const express = require('express');
const router = express.Router();
const { Gateway, Wallets } = require('fabric-network');
const path = require('path');
const fs = require('fs');

// 创建项目
router.post('/', async (req, res) => {
    try {
        const { 
            projectId, 
            name, 
            description, 
            startDate, 
            endDate, 
            categories, 
            totalFundingRequired,
            ownerId
        } = req.body;

        // 验证必填字段
        if (!projectId || !name || !description || !startDate || !endDate || !totalFundingRequired || !ownerId) {
            return res.status(400).json({
                success: false,
                message: '请提供所有必填字段'
            });
        }

        // 连接到网络
        const walletPath = path.join(process.cwd(), 'wallet');
        const wallet = await Wallets.newFileSystemWallet(walletPath);
        const userExists = await wallet.exists('admin');
        if (!userExists) {
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

        // 处理categories参数，确保它是字符串格式
        const categoriesStr = Array.isArray(categories) ? JSON.stringify(categories) : categories;

        // 创建项目
        const result = await contract.submitTransaction(
            'createProject', 
            projectId, 
            name, 
            description, 
            startDate, 
            endDate, 
            categoriesStr, 
            totalFundingRequired.toString(),
            ownerId
        );
        
        // 断开连接
        await gateway.disconnect();

        // 返回成功响应
        return res.status(201).json({
            success: true,
            message: '项目创建成功',
            data: JSON.parse(result.toString())
        });
    } catch (error) {
        console.error(`项目创建失败: ${error}`);
        return res.status(500).json({
            success: false,
            message: `创建失败: ${error.message}`
        });
    }
});

// 获取项目信息
router.get('/:projectId', async (req, res) => {
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
        
        // 断开连接
        await gateway.disconnect();

        return res.status(200).json({
            success: true,
            data: JSON.parse(result.toString())
        });
    } catch (error) {
        console.error(`查询项目失败: ${error}`);
        return res.status(500).json({
            success: false,
            message: `查询失败: ${error.message}`
        });
    }
});

// 获取项目列表
router.get('/', async (req, res) => {
    try {
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

        // 查询所有项目
        const result = await contract.evaluateTransaction('getAllProjects');
        
        // 断开连接
        await gateway.disconnect();

        return res.status(200).json({
            success: true,
            data: JSON.parse(result.toString())
        });
    } catch (error) {
        console.error(`查询项目列表失败: ${error}`);
        return res.status(500).json({
            success: false,
            message: `查询失败: ${error.message}`
        });
    }
});

// 更新项目状态
router.put('/:projectId/status', async (req, res) => {
    try {
        const { projectId } = req.params;
        const { newStatus } = req.body;

        if (!newStatus) {
            return res.status(400).json({
                success: false,
                message: '新状态是必填的'
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

        // 更新项目状态
        const result = await contract.submitTransaction('updateProjectStatus', projectId, newStatus);
        
        // 断开连接
        await gateway.disconnect();

        return res.status(200).json({
            success: true,
            message: `项目状态已更新为 ${newStatus}`,
            data: JSON.parse(result.toString())
        });
    } catch (error) {
        console.error(`更新项目状态失败: ${error}`);
        return res.status(500).json({
            success: false,
            message: `更新失败: ${error.message}`
        });
    }
});

// 添加里程碑
router.post('/:projectId/milestone', async (req, res) => {
    try {
        const { projectId } = req.params;
        const { milestoneId, description, deadline, fundingAmount } = req.body;

        if (!milestoneId || !description || !deadline || !fundingAmount) {
            return res.status(400).json({
                success: false,
                message: '请提供所有里程碑字段'
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

        // 添加里程碑
        const result = await contract.submitTransaction(
            'addMilestone',
            projectId,
            milestoneId,
            description,
            deadline,
            fundingAmount.toString()
        );
        
        // 断开连接
        await gateway.disconnect();

        return res.status(201).json({
            success: true,
            message: '里程碑添加成功',
            data: JSON.parse(result.toString())
        });
    } catch (error) {
        console.error(`添加里程碑失败: ${error}`);
        return res.status(500).json({
            success: false,
            message: `添加失败: ${error.message}`
        });
    }
});

module.exports = router; 