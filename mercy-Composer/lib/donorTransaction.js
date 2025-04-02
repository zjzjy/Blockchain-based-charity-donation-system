/**
 * donorTransaction.js - 捐赠者管理交易处理逻辑
 * 
 * 功能描述: 管理慈善平台上所有捐赠者的注册、验证和信息管理。
 * 这个脚本负责捐赠者的生命周期管理，包括身份验证(KYC)、
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

/**
 * 更新捐赠者KYC状态
 * 
 * @param {org.mercy.charity.UpdateKYCStatus} tx - 交易对象
 * @transaction
 */
async function updateKYCStatus(tx) {
    // 获取修改对象
    const donor = tx.donor;
    // 更新KYC状态
    donor.kycVerified = tx.isVerified;
    
    // 如果设置为已验证，添加验证时间
    if (tx.isVerified) {
        donor.kycVerificationDate = new Date();
    }
    
    // 保存更新到参与者数据库
    const participantRegistry = await getParticipantRegistry('org.mercy.charity.Donor');
    await participantRegistry.update(donor);
    
    // 发出事件
    const factory = getFactory();
    const event = factory.newEvent('org.mercy.charity', 'KYCStatusUpdated');
    event.donor = donor;
    event.isVerified = tx.isVerified;
    event.timestamp = new Date();
    emit(event);
}

/**
 * 更新捐赠者偏好类别
 * 
 * @param {Object} tx - 交易对象，包含捐赠者ID和偏好类别数组
 * @transaction
 */
async function updatePreferredCategories(tx) {
    // 获取捐赠者对象
    const donor = tx.donor;
    // 更新偏好类别
    donor.preferredCategories = tx.categories;
    
    // 保存更新到参与者数据库
    const participantRegistry = await getParticipantRegistry('org.mercy.charity.Donor');
    await participantRegistry.update(donor);
    
    // 发出事件
    const factory = getFactory();
    const event = factory.newEvent('org.mercy.charity', 'PreferredCategoriesUpdated');
    event.donor = donor;
    event.categories = tx.categories;
    event.timestamp = new Date();
    emit(event);
}

/**
 * 更新捐赠者总捐赠金额
 * 
 * @param {Object} tx - 交易对象，包含捐赠者ID和金额
 * @transaction
 */
async function updateTotalDonatedAmount(tx) {
    // 获取捐赠者对象
    const donor = tx.donor;
    // 更新总捐赠金额
    donor.totalDonatedAmount += tx.amount;
    
    // 保存更新到参与者数据库
    const participantRegistry = await getParticipantRegistry('org.mercy.charity.Donor');
    await participantRegistry.update(donor);
    
    // 发出事件
    const factory = getFactory();
    const event = factory.newEvent('org.mercy.charity', 'TotalDonatedAmountUpdated');
    event.donor = donor;
    event.amount = tx.amount;
    event.newTotal = donor.totalDonatedAmount;
    event.timestamp = new Date();
    emit(event);
}

/**
 * 更新捐赠者状态
 * 
 * @param {Object} tx - 交易对象，包含捐赠者ID和状态
 * @transaction
 */
async function updateDonorStatus(tx) {
    // 获取捐赠者对象
    const donor = tx.donor;
    // 更新状态
    donor.status = tx.status;
    
    // 保存更新到参与者数据库
    const participantRegistry = await getParticipantRegistry('org.mercy.charity.Donor');
    await participantRegistry.update(donor);
    
    // 发出事件
    const factory = getFactory();
    const event = factory.newEvent('org.mercy.charity', 'DonorStatusUpdated');
    event.donor = donor;
    event.status = tx.status;
    event.timestamp = new Date();
    emit(event);
} 