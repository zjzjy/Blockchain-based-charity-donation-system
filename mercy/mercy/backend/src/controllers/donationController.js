'use strict';

const { Gateway, Wallets } = require('fabric-network');
const path = require('path');
const fs = require('fs');
const logger = require('../utils/logger');

// 区块链网络连接配置
let gateway = null;
let network = null;
let donationContract = null;
let projectContract = null;

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
        donationContract = network.getContract('donationContract');
        projectContract = network.getContract('projectContract');
        
        logger.info('捐赠服务已连接到区块链网络');
        return true;
    } catch (error) {
        logger.error(`初始化捐赠服务失败: ${error}`);
        return false;
    }
};

// 创建捐赠
const createDonation = async (req, res) => {
    try {
        const { donorId, projectId, amount } = req.body;
        
        // 验证必填字段
        if (!donorId || !projectId || !amount) {
            return res.status(400).json({
                success: false,
                message: '捐赠者ID、项目ID和金额都是必填的'
            });
        }
        
        // 检查合约是否已初始化
        if (!donationContract) {
            const initialized = await initialize();
            if (!initialized) {
                return res.status(500).json({
                    success: false,
                    message: '无法连接到区块链网络'
                });
            }
        }
        
        // 调用智能合约创建捐赠
        const result = await donationContract.submitTransaction(
            'createDonation', 
            donorId, 
            projectId, 
            amount.toString()
        );
        
        return res.status(201).json({
            success: true,
            message: '捐赠创建成功',
            data: JSON.parse(result.toString())
        });
    } catch (error) {
        logger.error(`创建捐赠失败: ${error}`);
        return res.status(500).json({
            success: false,
            message: `创建失败: ${error.message}`
        });
    }
};

// 获取捐赠者的捐赠历史
const getDonationsByDonor = async (req, res) => {
    try {
        const { donorId } = req.params;
        
        // 检查合约是否已初始化
        if (!donationContract) {
            const initialized = await initialize();
            if (!initialized) {
                return res.status(500).json({
                    success: false,
                    message: '无法连接到区块链网络'
                });
            }
        }
        
        // 调用智能合约查询捐赠历史
        const result = await donationContract.evaluateTransaction('getDonationsByDonor', donorId);
        
        return res.status(200).json({
            success: true,
            data: JSON.parse(result.toString())
        });
    } catch (error) {
        logger.error(`查询捐赠历史失败: ${error}`);
        return res.status(500).json({
            success: false,
            message: `查询失败: ${error.message}`
        });
    }
};

// 获取项目的捐赠历史
const getDonationsByProject = async (req, res) => {
    try {
        const { projectId } = req.params;
        
        // 检查合约是否已初始化
        if (!donationContract) {
            const initialized = await initialize();
            if (!initialized) {
                return res.status(500).json({
                    success: false,
                    message: '无法连接到区块链网络'
                });
            }
        }
        
        // 调用智能合约查询项目捐赠历史
        const result = await donationContract.evaluateTransaction('getDonationsByProject', projectId);
        
        return res.status(200).json({
            success: true,
            data: JSON.parse(result.toString())
        });
    } catch (error) {
        logger.error(`查询项目捐赠历史失败: ${error}`);
        return res.status(500).json({
            success: false,
            message: `查询失败: ${error.message}`
        });
    }
};

// 分配资金到里程碑
const allocateFunds = async (req, res) => {
    try {
        const { projectId, milestoneId, amount } = req.body;
        
        // 验证必填字段
        if (!projectId || !milestoneId || !amount) {
            return res.status(400).json({
                success: false,
                message: '项目ID、里程碑ID和金额都是必填的'
            });
        }
        
        // 检查合约是否已初始化
        if (!projectContract) {
            const initialized = await initialize();
            if (!initialized) {
                return res.status(500).json({
                    success: false,
                    message: '无法连接到区块链网络'
                });
            }
        }
        
        // 调用智能合约分配资金到里程碑
        const result = await projectContract.submitTransaction(
            'allocateFundsToMilestone',
            projectId,
            milestoneId,
            amount.toString()
        );
        
        return res.status(200).json({
            success: true,
            message: '资金分配成功',
            data: JSON.parse(result.toString())
        });
    } catch (error) {
        logger.error(`资金分配失败: ${error}`);
        return res.status(500).json({
            success: false,
            message: `分配失败: ${error.message}`
        });
    }
};

module.exports = {
    initialize,
    createDonation,
    getDonationsByDonor,
    getDonationsByProject,
    allocateFunds
}; 