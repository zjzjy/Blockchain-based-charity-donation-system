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
        
        logger.info('项目服务已连接到区块链网络');
        return true;
    } catch (error) {
        logger.error(`初始化项目服务失败: ${error}`);
        return false;
    }
};

// 创建项目
const createProject = async (req, res) => {
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
        
        // 处理categories参数，确保它是字符串格式
        const categoriesStr = Array.isArray(categories) ? JSON.stringify(categories) : categories;
        
        // 调用智能合约创建项目
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
        
        return res.status(201).json({
            success: true,
            message: '项目创建成功',
            data: JSON.parse(result.toString())
        });
    } catch (error) {
        logger.error(`创建项目失败: ${error}`);
        return res.status(500).json({
            success: false,
            message: `创建失败: ${error.message}`
        });
    }
};

// 获取项目信息
const getProject = async (req, res) => {
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
        
        return res.status(200).json({
            success: true,
            data: JSON.parse(result.toString())
        });
    } catch (error) {
        logger.error(`查询项目失败: ${error}`);
        return res.status(500).json({
            success: false,
            message: `查询失败: ${error.message}`
        });
    }
};

// 获取项目列表
const getProjects = async (req, res) => {
    try {
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
        
        // 调用智能合约查询所有项目
        const result = await contract.evaluateTransaction('getAllProjects');
        
        return res.status(200).json({
            success: true,
            data: JSON.parse(result.toString())
        });
    } catch (error) {
        logger.error(`查询项目列表失败: ${error}`);
        return res.status(500).json({
            success: false,
            message: `查询失败: ${error.message}`
        });
    }
};

// 更新项目状态
const updateProjectStatus = async (req, res) => {
    try {
        const { projectId } = req.params;
        const { newStatus } = req.body;
        
        if (!newStatus) {
            return res.status(400).json({
                success: false,
                message: '新状态是必填的'
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
        
        // 调用智能合约更新项目状态
        const result = await contract.submitTransaction('updateProjectStatus', projectId, newStatus);
        
        return res.status(200).json({
            success: true,
            message: `项目状态已更新为 ${newStatus}`,
            data: JSON.parse(result.toString())
        });
    } catch (error) {
        logger.error(`更新项目状态失败: ${error}`);
        return res.status(500).json({
            success: false,
            message: `更新失败: ${error.message}`
        });
    }
};

// 添加里程碑
const addMilestone = async (req, res) => {
    try {
        const { projectId } = req.params;
        const { milestoneId, description, deadline, fundingAmount } = req.body;
        
        if (!milestoneId || !description || !deadline || !fundingAmount) {
            return res.status(400).json({
                success: false,
                message: '请提供所有里程碑字段'
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
        
        // 调用智能合约添加里程碑
        const result = await contract.submitTransaction(
            'addMilestone',
            projectId,
            milestoneId,
            description,
            deadline,
            fundingAmount.toString()
        );
        
        return res.status(201).json({
            success: true,
            message: '里程碑添加成功',
            data: JSON.parse(result.toString())
        });
    } catch (error) {
        logger.error(`添加里程碑失败: ${error}`);
        return res.status(500).json({
            success: false,
            message: `添加失败: ${error.message}`
        });
    }
};

module.exports = {
    initialize,
    createProject,
    getProject,
    getProjects,
    updateProjectStatus,
    addMilestone
}; 