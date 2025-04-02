'use strict';

const express = require('express');
const router = express.Router();
const { Gateway, Wallets } = require('fabric-network');
const path = require('path');
const fs = require('fs');

// 项目所有者注册
router.post('/register', async (req, res) => {
    try {
        const { projectOwnerId, name, email, phone } = req.body;

        // 验证必填字段
        if (!projectOwnerId || !name || !email || !phone) {
            return res.status(400).json({
                success: false,
                message: '所有字段都是必填的'
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
        const contract = network.getContract('mercy', 'org.mercy.charity.project');

        // 注册项目所有者
        const result = await contract.submitTransaction('registerProjectOwner', projectOwnerId, name, email, phone);
        
        // 断开连接
        await gateway.disconnect();

        // 返回成功响应
        return res.status(201).json({ 
            success: true, 
            message: '项目所有者注册成功', 
            data: JSON.parse(result.toString()) 
        });
    } catch (error) {
        console.error(`注册项目所有者失败: ${error}`);
        return res.status(500).json({ error: error.message });
    }
});

// 获取项目所有者信息
router.get('/:projectOwnerId', async (req, res) => {
    try {
        const { projectOwnerId } = req.params;
        if (!projectOwnerId) {
            return res.status(400).json({ error: '项目所有者ID是必需的' });
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
        const contract = network.getContract('mercy', 'org.mercy.charity.project');

        // 查询项目所有者信息
        const result = await contract.evaluateTransaction('getProjectOwner', projectOwnerId);
        
        // 断开连接
        await gateway.disconnect();

        // 返回成功响应
        return res.status(200).json({ 
            success: true, 
            data: JSON.parse(result.toString()) 
        });
    } catch (error) {
        console.error(`获取项目所有者信息失败: ${error}`);
        return res.status(500).json({ error: error.message });
    }
});

// 更新项目所有者信息
router.put('/:projectOwnerId', async (req, res) => {
    try {
        const { projectOwnerId } = req.params;
        const { name, email, phone } = req.body;
        
        if (!projectOwnerId) {
            return res.status(400).json({ error: '项目所有者ID是必需的' });
        }
        
        if (!name && !email && !phone) {
            return res.status(400).json({ error: '至少需要提供一项更新信息' });
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
        const contract = network.getContract('mercy', 'org.mercy.charity.project');

        // 更新项目所有者信息
        const result = await contract.submitTransaction('updateProjectOwner', projectOwnerId, name, email, phone);
        
        // 断开连接
        await gateway.disconnect();

        // 返回成功响应
        return res.status(200).json({ 
            success: true, 
            message: '项目所有者信息更新成功', 
            data: JSON.parse(result.toString()) 
        });
    } catch (error) {
        console.error(`更新项目所有者信息失败: ${error}`);
        return res.status(500).json({ error: error.message });
    }
});

// 获取项目所有者的项目列表
router.get('/:projectOwnerId/projects', async (req, res) => {
    try {
        const { projectOwnerId } = req.params;
        if (!projectOwnerId) {
            return res.status(400).json({ error: '项目所有者ID是必需的' });
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
        const contract = network.getContract('mercy', 'org.mercy.charity.project');

        // 查询项目所有者的项目列表
        const result = await contract.evaluateTransaction('getProjectOwnerProjects', projectOwnerId);
        
        // 断开连接
        await gateway.disconnect();

        // 返回成功响应
        return res.status(200).json({ 
            success: true, 
            data: JSON.parse(result.toString()) 
        });
    } catch (error) {
        console.error(`获取项目所有者的项目列表失败: ${error}`);
        return res.status(500).json({ error: error.message });
    }
});

module.exports = router; 