/**
 * donorContract.js - 捐赠者管理智能合约
 * 
 * 功能描述: 管理慈善平台上所有捐赠者的注册、验证和信息管理。
 * 这个合约负责捐赠者的生命周期管理，包括身份验证(KYC)、
 * 偏好设置、状态更新以及捐赠统计跟踪等功能。
 * 
 * 主要功能:
 * 1. 捐赠者注册与身份管理
 * 2. KYC验证流程
 * 3. 捐赠者偏好设置
 * 4. 捐赠统计与历史记录
 * 5. 捐赠者状态维护
 * 
 * 作者: Junyin
 * 版本: 1.0
 */
'use strict';

// 导入Fabric合约API库，用于创建智能合约
const { Contract } = require('fabric-contract-api');

/**
 * 捐赠者合约类 - 处理所有与捐赠者相关的交易
 * 
 * 这个类继承自Fabric的Contract基类，实现了捐赠者管理相关的所有业务逻辑。
 * 通过这个合约，平台可以管理捐赠者的整个生命周期，并确保捐赠过程的合规性。
 */
class DonorContract extends Contract {
    /**
     * 构造函数 - 初始化合约并设置命名空间
     * 
     * @description 
     * 设置合约命名空间为'org.mercy.charity.donor'，用于在通道上
     * 唯一标识该合约，并将其与其他合约区分开来。
     */
    constructor() {
        // 调用父类构造函数并设置合约命名空间
        super('org.mercy.charity.donor');
    }

    /**
     * 注册新捐赠者
     * 
     * @description
     * 在区块链上创建新的捐赠者记录，包含基本信息和初始状态设置。
     * 新注册的捐赠者默认未通过KYC验证，需要后续验证才能进行捐赠。
     * 
     * @param {Context} ctx - 交易上下文对象，提供区块链交互的API
     * @param {String} donorId - 捐赠者唯一标识符
     * @param {String} name - 捐赠者姓名
     * @param {String} email - 捐赠者电子邮箱，用于通知和联系
     * @param {String} phone - 捐赠者电话号码，用于身份验证
     * @param {String} walletAddress - 捐赠者钱包地址，用于资金操作
     * 
     * @returns {String} 新创建的捐赠者信息的JSON字符串表示
     */
    async registerDonor(ctx, donorId, name, email, phone, walletAddress) {
        // 创建捐赠者对象，包含所有必要的初始信息和状态
        const donor = {
            donorId,                   // 唯一标识符
            name,                      // 姓名
            email,                     // 电子邮箱
            phone,                     // 电话号码
            walletAddress,             // 钱包地址
            kycVerified: false,        // KYC验证状态，初始为未验证
            preferredCategories: [],   // 偏好的项目类别，初始为空
            totalDonatedAmount: 0,     // 总捐赠金额，初始为0
            registrationDate: new Date().toISOString(), // 注册日期，ISO格式时间戳
            status: 'ACTIVE'           // 账户状态，初始为激活状态
        };

        // 将捐赠者数据保存到区块链状态数据库
        await ctx.stub.putState(donorId, Buffer.from(JSON.stringify(donor)));
        // 返回新创建的捐赠者信息
        return JSON.stringify(donor);
    }

    /**
     * 更新捐赠者KYC状态
     * 
     * @description
     * 更新捐赠者的KYC(了解你的客户)验证状态。
     * KYC验证是确保平台合规性和防止欺诈的重要步骤。
     * 
     * @param {Context} ctx - 交易上下文对象
     * @param {String} donorId - 捐赠者ID
     * @param {Boolean} isVerified - 验证状态，true表示已验证，false表示未验证
     * 
     * @returns {String} 更新后的捐赠者信息的JSON字符串
     * @throws {Error} 如果指定的捐赠者不存在
     */
    async updateKYCStatus(ctx, donorId, isVerified) {
        // 从区块链获取捐赠者记录
        const donorBytes = await ctx.stub.getState(donorId);
        // 检查捐赠者是否存在
        if (!donorBytes || donorBytes.length === 0) {
            throw new Error(`捐赠者 ${donorId} 不存在`);
        }

        // 解析捐赠者数据并更新KYC状态
        const donor = JSON.parse(donorBytes.toString());
        donor.kycVerified = isVerified;
        // 将更新后的捐赠者数据保存回区块链
        await ctx.stub.putState(donorId, Buffer.from(JSON.stringify(donor)));
        // 返回更新后的捐赠者信息
        return JSON.stringify(donor);
    }

    /**
     * 验证捐赠者 (KYC)
     * 
     * @description
     * 执行捐赠者的KYC验证流程，将其标记为已验证状态，并记录验证时间和验证人。
     * 此方法比updateKYCStatus更详细，会添加验证时间戳并触发事件通知。
     * 
     * @param {Context} ctx - 交易上下文对象
     * @param {String} donorId - 捐赠者ID
     * 
     * @returns {String} 验证后的捐赠者信息的JSON字符串
     * @throws {Error} 如果指定的捐赠者不存在
     */
    async verifyDonor(ctx, donorId) {
        // 从区块链获取捐赠者记录
        const donorBytes = await ctx.stub.getState(donorId);
        // 检查捐赠者是否存在
        if (!donorBytes || donorBytes.length === 0) {
            throw new Error(`捐赠者 ${donorId} 不存在`);
        }

        // 解析捐赠者数据并将KYC状态设置为已验证
        const donor = JSON.parse(donorBytes.toString());
        donor.kycVerified = true;
        
        // 记录验证时间，用于审计和合规检查
        donor.kycVerificationDate = new Date().toISOString();
        
        // 发出验证事件，通知其他系统组件捐赠者已完成验证
        const verificationEvent = {
            donorId: donor.donorId,                  // 捐赠者ID
            verificationDate: donor.kycVerificationDate, // 验证日期
            verifiedBy: ctx.clientIdentity.getID()       // 验证人身份
        };
        // 设置事件，外部系统可以监听此事件并执行相应操作
        ctx.stub.setEvent('DonorVerified', Buffer.from(JSON.stringify(verificationEvent)));
        
        // 将更新后的捐赠者数据保存回区块链
        await ctx.stub.putState(donorId, Buffer.from(JSON.stringify(donor)));
        // 返回验证后的捐赠者信息
        return JSON.stringify(donor);
    }
    /** 
     * updateKYCStatus和verifyDonor的区别：
     * updateKYCStatus：可以将KYC状态设置为true或false，
     * 而verifyDonor：只能将KYC状态设置为true，不能设置为false。
     * updateKYCStatus：仅更新kycVerified字段
     * verifyDonor：除了更新kycVerified外，还会记录验证时间，添加kycVerificationDate字段
     * updateKYCStatus：适用于更通用的状态管理
     * verifyDonor：适用于严格的KYC验证流程
    */

    /**
     * 更新捐赠者偏好类别
     * 
     * @description
     * 更新捐赠者感兴趣的项目类别，用于个性化推荐和匹配合适的项目。
     * 
     * @param {Context} ctx - 交易上下文对象
     * @param {String} donorId - 捐赠者ID
     * @param {Array} categories - 捐赠者偏好的项目类别数组
     * 
     * @returns {String} 更新后的捐赠者信息的JSON字符串
     * @throws {Error} 如果指定的捐赠者不存在
     */
    async updatePreferredCategories(ctx, donorId, categories) {
        // 从区块链获取捐赠者记录
        const donorBytes = await ctx.stub.getState(donorId);
        // 检查捐赠者是否存在
        if (!donorBytes || donorBytes.length === 0) {
            throw new Error(`捐赠者 ${donorId} 不存在`);
        }

        // 解析捐赠者数据并更新偏好类别
        const donor = JSON.parse(donorBytes.toString());
        donor.preferredCategories = categories;
        // 将更新后的捐赠者数据保存回区块链
        await ctx.stub.putState(donorId, Buffer.from(JSON.stringify(donor)));
        // 返回更新后的捐赠者信息
        return JSON.stringify(donor);
    }

    /**
     * 查询捐赠者信息
     * 
     * @description
     * 根据捐赠者ID查询捐赠者的详细信息。
     * 这个方法是只读操作，不修改区块链状态。
     * 
     * @param {Context} ctx - 交易上下文对象
     * @param {String} donorId - 捐赠者ID
     * 
     * @returns {String} 捐赠者信息的JSON字符串
     * @throws {Error} 如果指定的捐赠者不存在
     */
    async queryDonor(ctx, donorId) {
        // 从区块链获取捐赠者记录
        const donorBytes = await ctx.stub.getState(donorId);
        // 检查捐赠者是否存在
        if (!donorBytes || donorBytes.length === 0) {
            throw new Error(`捐赠者 ${donorId} 不存在`);
        }
        // 直接返回捐赠者信息的字符串表示
        return donorBytes.toString();
    }

    /**
     * 更新捐赠者总捐赠金额
     * 
     * @description
     * 当捐赠者完成新的捐赠时，更新其累计捐赠总额。
     * 这个方法通常由捐赠合约在创建新捐赠时调用。
     * 
     * @param {Context} ctx - 交易上下文对象
     * @param {String} donorId - 捐赠者ID
     * @param {Number} amount - 新增捐赠金额
     * 
     * @returns {String} 更新后的捐赠者信息的JSON字符串
     * @throws {Error} 如果指定的捐赠者不存在
     */
    async updateTotalDonatedAmount(ctx, donorId, amount) {
        // 从区块链获取捐赠者记录
        const donorBytes = await ctx.stub.getState(donorId);
        // 检查捐赠者是否存在
        if (!donorBytes || donorBytes.length === 0) {
            throw new Error(`捐赠者 ${donorId} 不存在`);
        }

        // 解析捐赠者数据并更新总捐赠金额
        const donor = JSON.parse(donorBytes.toString());
        donor.totalDonatedAmount += amount;
        // 将更新后的捐赠者数据保存回区块链
        await ctx.stub.putState(donorId, Buffer.from(JSON.stringify(donor)));
        // 返回更新后的捐赠者信息
        return JSON.stringify(donor);
    }

    /**
     * 更新捐赠者状态
     * 
     * @description
     * 更新捐赠者账户状态，如激活(ACTIVE)、暂停(SUSPENDED)或关闭(CLOSED)。
     * 状态变更可能由管理员发起，用于账户管理和风险控制。
     * 
     * @param {Context} ctx - 交易上下文对象
     * @param {String} donorId - 捐赠者ID
     * @param {String} status - 新的账户状态值
     * 
     * @returns {String} 更新后的捐赠者信息的JSON字符串
     * @throws {Error} 如果指定的捐赠者不存在
     */
    async updateDonorStatus(ctx, donorId, status) {
        // 从区块链获取捐赠者记录
        const donorBytes = await ctx.stub.getState(donorId);
        // 检查捐赠者是否存在
        if (!donorBytes || donorBytes.length === 0) {
            throw new Error(`捐赠者 ${donorId} 不存在`);
        }

        // 解析捐赠者数据并更新状态
        const donor = JSON.parse(donorBytes.toString());
        donor.status = status;
        // 将更新后的捐赠者数据保存回区块链
        await ctx.stub.putState(donorId, Buffer.from(JSON.stringify(donor)));
        // 返回更新后的捐赠者信息
        return JSON.stringify(donor);
    }
}

// 导出DonorContract类，使其可以被其他模块引用
module.exports = DonorContract; 