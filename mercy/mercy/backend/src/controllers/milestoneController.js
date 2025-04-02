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
        contract = network.getContract('projectContract');
        
        logger.info('里程碑服务已连接到区块链网络');
        return true;
    } catch (error) {
        logger.error(`初始化里程碑服务失败: ${error}`);
        return false;
    }
};

// 更新里程碑状态
const updateMilestone = async (req, res) => {
    try {
        const { projectId, milestoneId } = req.params;
        const { isCompleted, completionDate } = req.body;
        
        if (isCompleted === undefined) {
            return res.status(400).json({
                success: false,
                message: '完成状态是必填的'
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
        
        // 调用智能合约更新里程碑
        const result = await contract.submitTransaction(
            'updateMilestone',
            projectId,
            milestoneId,
            isCompleted.toString(),
            completionDate || ''
        );
        
        return res.status(200).json({
            success: true,
            message: `里程碑状态已更新为${isCompleted ? '已完成' : '未完成'}`,
            data: JSON.parse(result.toString())
        });
    } catch (error) {
        logger.error(`更新里程碑状态失败: ${error}`);
        return res.status(500).json({
            success: false,
            message: `更新失败: ${error.message}`
        });
    }
};

// 获取项目的所有里程碑
const getMilestonesByProject = async (req, res) => {
    try {
        const { projectId } = req.params;
        
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
        
        // 调用智能合约查询项目
        const result = await contract.evaluateTransaction('queryProject', projectId);
        const project = JSON.parse(result.toString());
        
        return res.status(200).json({
            success: true,
            data: project.milestones || []
        });
    } catch (error) {
        logger.error(`查询项目里程碑失败: ${error}`);
        return res.status(500).json({
            success: false,
            message: `查询失败: ${error.message}`
        });
    }
};

// 获取里程碑详情
const getMilestone = async (req, res) => {
    try {
        const { projectId, milestoneId } = req.params;
        
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
        
        // 调用智能合约查询项目
        const result = await contract.evaluateTransaction('queryProject', projectId);
        const project = JSON.parse(result.toString());
        
        // 查找特定里程碑
        const milestone = project.milestones.find(m => m.milestoneId === milestoneId);
        
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
        logger.error(`查询里程碑详情失败: ${error}`);
        return res.status(500).json({
            success: false,
            message: `查询失败: ${error.message}`
        });
    }
};

module.exports = {
    initialize,
    updateMilestone,
    getMilestonesByProject,
    getMilestone
}; 