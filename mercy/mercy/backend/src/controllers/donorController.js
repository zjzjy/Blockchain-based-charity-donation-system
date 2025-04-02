'use strict';

const { Gateway, Wallets } = require('fabric-network');
const path = require('path');
const fs = require('fs');
const logger = require('../utils/logger');

// 区块链网络连接配置
let gateway = null;
let network = null;
let contract = null;

// 初始化区块链连接
const initialize = async () => {
    try {
        // 创建钱包
        const walletPath = path.join(process.cwd(), 'wallet');
        const wallet = await Wallets.newFileSystemWallet(walletPath);
        
        // 检查管理员身份是否存在
        const identity = await wallet.get('admin');
        if (!identity) {
            logger.error('管理员身份不存在，请先注册管理员');
            return false;
        }
        
        // 加载连接配置
        const ccpPath = path.resolve(process.cwd(), 'config', 'connection.json');
        const ccp = JSON.parse(fs.readFileSync(ccpPath, 'utf8'));
        
        // 连接到网关
        gateway = new Gateway();
        await gateway.connect(ccp, { 
            wallet, 
            identity: 'admin', 
            discovery: { enabled: true, asLocalhost: true } 
        });
        
        // 获取网络和合约
        network = await gateway.getNetwork('mercychannel');
        contract = network.getContract('donorContract');
        
        logger.info('捐赠者服务已连接到区块链网络');
        return true;
    } catch (error) {
        logger.error(`初始化捐赠者服务失败: ${error}`);
        return false;
    }
};

// 注册捐赠者
const registerDonor = async (req, res) => {
    try {
        const { donorId, name, email, phone, walletAddress } = req.body;
        
        // 验证必填字段
        if (!donorId || !name || !email || !phone) {
            return res.status(400).json({
                success: false,
                message: '所有字段都是必填的'
            });
        }
        
        // 检查合约是否已初始化
        if (!contract) {
            const initialized = await initialize();
            if (!initialized) {
                return res.status(500).json({
                    success: false,
                    message: '无法连接到区块链网络'
                });
            }
        }
        
        // 调用智能合约注册捐赠者
        const result = await contract.submitTransaction(
            'registerDonor', 
            donorId, 
            name, 
            email, 
            phone, 
            walletAddress || ''
        );
        
        return res.status(201).json({
            success: true,
            message: '捐赠者注册成功',
            data: JSON.parse(result.toString())
        });
    } catch (error) {
        logger.error(`注册捐赠者失败: ${error}`);
        return res.status(500).json({
            success: false,
            message: `注册失败: ${error.message}`
        });
    }
};

// 验证捐赠者KYC状态
const verifyDonor = async (req, res) => {
    try {
        const { donorId } = req.params;
        const { isVerified } = req.body;
        
        if (isVerified === undefined) {
            return res.status(400).json({
                success: false,
                message: '验证状态是必填的'
            });
        }
        
        // 检查合约是否已初始化
        if (!contract) {
            const initialized = await initialize();
            if (!initialized) {
                return res.status(500).json({
                    success: false,
                    message: '无法连接到区块链网络'
                });
            }
        }
        
        // 调用智能合约验证捐赠者
        await contract.submitTransaction('verifyDonor', donorId, isVerified.toString());
        
        return res.status(200).json({
            success: true,
            message: `捐赠者 ${donorId} 验证状态已更新为 ${isVerified}`
        });
    } catch (error) {
        logger.error(`验证捐赠者失败: ${error}`);
        return res.status(500).json({
            success: false,
            message: `验证失败: ${error.message}`
        });
    }
};

// 获取捐赠者信息
const getDonor = async (req, res) => {
    try {
        const { donorId } = req.params;
        
        // 检查合约是否已初始化
        if (!contract) {
            const initialized = await initialize();
            if (!initialized) {
                return res.status(500).json({
                    success: false,
                    message: '无法连接到区块链网络'
                });
            }
        }
        
        // 调用智能合约查询捐赠者
        const result = await contract.evaluateTransaction('queryDonor', donorId);
        
        return res.status(200).json({
            success: true,
            data: JSON.parse(result.toString())
        });
    } catch (error) {
        logger.error(`查询捐赠者失败: ${error}`);
        return res.status(500).json({
            success: false,
            message: `查询失败: ${error.message}`
        });
    }
};

module.exports = {
    initialize,
    registerDonor,
    verifyDonor,
    getDonor
}; 