/**
 * donationContract.js - 慈善捐赠智能合约
 * 
 * 功能描述: 管理慈善平台上所有捐赠交易的创建、更新和查询。
 * 这个合约是整个慈善系统的核心组件之一，负责处理资金流动、
 * 验证捐赠资格、记录捐赠历史，以及维护捐赠状态的完整生命周期。
 * 
 * 主要功能:
 * 1. 捐赠交易的创建与验证
 * 2. 捐赠状态的更新管理
 * 3. 捐赠记录的查询与检索
 * 4. 与项目和捐赠者合约的交互
 * 
 * 作者: Junyin
 * 版本: 1.0
 */
'use strict';

// 导入Fabric合约API库，用于创建智能合约
const { Contract } = require('fabric-contract-api');

/**
 * 捐赠合约类 - 处理所有与捐赠相关的交易
 * 
 * 这个类继承自Fabric的Contract基类，实现了捐赠业务逻辑的所有方法。
 * 每个方法对应区块链上可调用的一个交易类型，通过交易上下文(ctx)与账本进行交互。
 */
class DonationContract extends Contract {
    /**
     * 构造函数 - 初始化合约并设置命名空间
     * 
     * @description 
     * 设置合约命名空间为'org.mercy.charity.donation'，用于在通道上
     * 唯一标识该合约，并将其与其他合约区分开来。
     */
    constructor() {
        // 调用父类构造函数并设置合约命名空间
        super('org.mercy.charity.donation');
    }

    /**
     * 创建捐赠交易
     * 
     * @description
     * 记录捐赠者向特定项目的捐赠行为。这个方法包含多项验证：
     * 1. 验证捐赠者是否存在且已通过KYC验证
     * 2. 验证项目是否存在且处于可接受捐赠的状态
     * 3. 创建捐赠记录并关联到捐赠者和项目
     * 4. 更新项目的资金状态
     * 5. 更新捐赠者的总捐赠额
     * 
     * @param {Context} ctx - 交易上下文对象，提供区块链交互的API
     * @param {String} transactionId - 捐赠交易唯一标识符，用于后续跟踪和查询
     * @param {String} donorId - 捐赠者ID，必须是已注册且KYC验证通过的捐赠者
     * @param {String} projectId - 接收捐赠的项目ID
     * @param {Number} amount - 捐赠金额，必须为正数
     * 
     * @returns {String} 创建的捐赠交易信息的JSON字符串表示
     * @throws {Error} 如果捐赠者不存在、未通过KYC验证或项目不存在/不接受捐赠时抛出错误
     */
    async makeDonation(ctx, transactionId, donorId, projectId, amount) {
        // 第一步：验证捐赠者是否存在及KYC状态
        // 从账本状态数据库中获取捐赠者信息
        const donorBytes = await ctx.stub.getState(donorId);
        // 如果捐赠者不存在，抛出错误并中止交易
        if (!donorBytes || donorBytes.length === 0) {
            throw new Error(`捐赠者 ${donorId} 不存在`);
        }
        // 将二进制数据转换为JavaScript对象
        const donor = JSON.parse(donorBytes.toString());
        // 检查捐赠者是否通过KYC验证，未验证的捐赠者不能进行捐赠
        // 这是防止非法资金流动的重要安全措施
        if (!donor.kycVerified) {
            throw new Error(`捐赠者 ${donorId} 未通过KYC验证`);
        }

        // 第二步：验证项目是否存在及其状态
        // 从账本状态数据库中获取项目信息
        const projectBytes = await ctx.stub.getState(projectId);
        // 如果项目不存在，抛出错误并中止交易
        if (!projectBytes || projectBytes.length === 0) {
            throw new Error(`项目 ${projectId} 不存在`);
        }
        // 将二进制数据转换为JavaScript对象
        const project = JSON.parse(projectBytes.toString());
        // 检查项目状态是否允许接受捐赠
        // 只有处于"已注册"或"进行中"状态的项目才能接受捐赠
        if (project.projectStatus !== 'REGISTERED' && project.projectStatus !== 'IN_PROGRESS') {
            throw new Error(`项目 ${projectId} 目前不接受捐赠`);
        }

        // 第三步：创建捐赠记录对象
        // 构建包含所有必要信息的捐赠对象
        const donation = {
            transactionId,              // 交易ID作为唯一标识
            donorId,                    // 捐赠者ID，关联到捐赠者
            projectId,                  // 项目ID，关联到受捐项目
            amount: parseFloat(amount), // 确保金额为数字类型
            timestamp: new Date().toISOString(), // 记录捐赠时间戳，ISO格式便于排序和查询
            status: 'PENDING'           // 初始状态为待处理，后续可能更新为"已完成"或"失败"
        };

        // 第四步：更新项目资金状态
        // 由于资金更新涉及到项目状态的变化，我们调用项目合约来处理
        // 加载项目合约并调用更新方法
        const projectContract = new (require('./projectContract'))();
        await projectContract.updateFundingStatus(ctx, projectId, amount);

        // 第五步：更新捐赠者总捐赠金额
        // 更新捐赠者的捐赠统计信息，用于跟踪和激励
        // 加载捐赠者合约并调用更新方法
        const donorContract = new (require('./donorContract'))();
        await donorContract.updateTotalDonatedAmount(ctx, donorId, amount);

        // 第六步：将捐赠记录保存到状态数据库
        // 使用交易ID作为键，JSON序列化的捐赠对象作为值
        await ctx.stub.putState(transactionId, Buffer.from(JSON.stringify(donation)));
        
        // 返回创建的捐赠记录的JSON字符串
        return JSON.stringify(donation);
    }

    /**
     * 更新捐赠状态
     * 
     * @description
     * 更新特定捐赠交易的状态，如将"待处理"状态更新为"已完成"或"失败"。
     * 这个方法通常由系统管理员或自动化流程在资金实际转移后调用。
     * 
     * @param {Context} ctx - 交易上下文对象
     * @param {String} transactionId - 要更新的捐赠交易ID
     * @param {String} status - 新的捐赠状态值，如'COMPLETED'、'FAILED'等
     * 
     * @returns {String} 更新后的捐赠交易信息的JSON字符串
     * @throws {Error} 如果指定的捐赠交易不存在
     */
    async updateDonationStatus(ctx, transactionId, status) {
        // 从账本获取捐赠交易记录
        const donationBytes = await ctx.stub.getState(transactionId);
        // 检查记录是否存在
        if (!donationBytes || donationBytes.length === 0) {
            throw new Error(`捐赠交易 ${transactionId} 不存在`);
        }

        // 解析记录并更新状态
        const donation = JSON.parse(donationBytes.toString());
        // 设置新状态
        donation.status = status;
        // 可以添加状态变更时间戳，便于审计
        donation.lastUpdated = new Date().toISOString();
        
        // 将更新后的记录保存回账本
        await ctx.stub.putState(transactionId, Buffer.from(JSON.stringify(donation)));
        
        // 返回更新后的记录
        return JSON.stringify(donation);
    }

    /**
     * 查询单个捐赠交易详情
     * 
     * @description
     * 根据交易ID查询特定捐赠交易的详细信息。
     * 这个方法是只读操作，不修改账本状态。
     * 
     * @param {Context} ctx - 交易上下文对象
     * @param {String} transactionId - 捐赠交易ID
     * 
     * @returns {String} 捐赠交易信息的JSON字符串
     * @throws {Error} 如果指定的捐赠交易不存在
     */
    async queryDonation(ctx, transactionId) {
        // 从账本获取捐赠交易记录
        const donationBytes = await ctx.stub.getState(transactionId);
        // 检查记录是否存在
        if (!donationBytes || donationBytes.length === 0) {
            throw new Error(`捐赠交易 ${transactionId} 不存在`);
        }
        
        // 直接返回记录的字符串表示
        return donationBytes.toString();
    }

    /**
     * 查询特定捐赠者的所有捐赠记录
     * 
     * @description
     * 查询特定捐赠者参与的所有捐赠交易记录，按照时间戳降序排序。
     * 这个方法使用Fabric的富查询功能(CouchDB)来实现复杂查询。
     * 
     * @param {Context} ctx - 交易上下文对象
     * @param {String} donorId - 捐赠者ID
     * 
     * @returns {String} 捐赠记录列表的JSON字符串
     */
    async queryDonorDonations(ctx, donorId) {
        // 构建查询选择器，筛选donorId匹配的记录
        // 这里使用了CouchDB的查询语法
        const query = {
            selector: {
                donorId: donorId  // 查找特定捐赠者的所有捐赠
            },
            // 可以添加排序条件，例如按时间戳降序
            sort: [{ timestamp: 'desc' }]
        };

        // 执行查询并收集结果
        const iterator = await ctx.stub.getQueryResult(JSON.stringify(query));
        const results = [];
        let result = await iterator.next();
        
        // 迭代所有结果并添加到结果数组
        while (!result.done) {
            // 解析每条记录并添加到结果集
            results.push(JSON.parse(result.value.value.toString()));
            result = await iterator.next();
        }
        
        // 返回结果数组的JSON字符串
        return JSON.stringify(results);
    }

    /**
     * 查询特定项目的所有捐赠记录
     * 
     * @description
     * 查询特定项目收到的所有捐赠交易记录，可用于项目资金透明度和审计。
     * 这个方法使用Fabric的富查询功能(CouchDB)来实现复杂查询。
     * 
     * @param {Context} ctx - 交易上下文对象
     * @param {String} projectId - 项目ID
     * 
     * @returns {String} 捐赠记录列表的JSON字符串
     */
    async queryProjectDonations(ctx, projectId) {
        // 构建查询选择器，筛选projectId匹配的记录
        const query = {
            selector: {
                projectId: projectId  // 查找特定项目的所有捐赠
            },
            // 可以添加排序条件，例如按金额降序
            sort: [{ amount: 'desc' }]
        };

        // 执行查询并收集结果
        const iterator = await ctx.stub.getQueryResult(JSON.stringify(query));
        const results = [];
        let result = await iterator.next();
        
        // 迭代所有结果并添加到结果数组
        while (!result.done) {
            // 解析每条记录并添加到结果集
            results.push(JSON.parse(result.value.value.toString()));
            result = await iterator.next();
        }
        
        // 返回结果数组的JSON字符串
        return JSON.stringify(results);
    }
}

// 导出DonationContract类，使其可以被其他模块引用
module.exports = DonationContract; 