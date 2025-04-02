'use strict';

const express = require('express');
const router = express.Router();
const { Gateway, Wallets } = require('fabric-network');
const path = require('path');
const fs = require('fs');

// 捐赠者注册
router.post('/register', async (req, res) => {
    try {
        const { donorId, name, email, phone, walletAddress } = req.body;

        // 验证必填字段
        if (!donorId || !name || !email || !phone) {
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
        const contract = network.getContract('donorContract');

        // 注册捐赠者
        const result = await contract.submitTransaction('registerDonor', donorId, name, email, phone, walletAddress || '');
        
        // 断开连接
        await gateway.disconnect();

        // 返回成功响应
        return res.status(201).json({
            success: true,
            message: '捐赠者注册成功',
            data: JSON.parse(result.toString())
        });
    } catch (error) {
        console.error(`捐赠者注册失败: ${error}`);
        return res.status(500).json({
            success: false,
            message: `注册失败: ${error.message}`
        });
    }
});

// 验证捐赠者KYC状态
router.put('/verify/:donorId', async (req, res) => {
    try {
        const { donorId } = req.params;
        const { isVerified } = req.body;

        if (isVerified === undefined) {
            return res.status(400).json({
                success: false,
                message: '验证状态是必填的'
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
        const contract = network.getContract('donorContract');

        // 验证捐赠者
        await contract.submitTransaction('verifyDonor', donorId, isVerified.toString());
        
        // 断开连接
        await gateway.disconnect();

        return res.status(200).json({
            success: true,
            message: `捐赠者 ${donorId} 验证状态已更新为 ${isVerified}`,
        });
    } catch (error) {
        console.error(`验证捐赠者失败: ${error}`);
        return res.status(500).json({
            success: false,
            message: `验证失败: ${error.message}`
        });
    }
});

// 获取捐赠者信息
router.get('/:donorId', async (req, res) => {
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
        const contract = network.getContract('donorContract');

        // 查询捐赠者
        const result = await contract.evaluateTransaction('queryDonor', donorId);
        
        // 断开连接
        await gateway.disconnect();

        return res.status(200).json({
            success: true,
            data: JSON.parse(result.toString())
        });
    } catch (error) {
        console.error(`查询捐赠者失败: ${error}`);
        return res.status(500).json({
            success: false,
            message: `查询失败: ${error.message}`
        });
    }
});

module.exports = router; 