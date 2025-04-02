/**
 * donationTransaction.js - 捐赠交易处理逻辑
 * 
 * 功能描述: 管理慈善平台上所有捐赠活动的处理逻辑。
 * 这个脚本处理捐赠从发起到完成的整个流程，包括资金转移、
 * 记录更新以及相关的通知和事件触发。
 * 
 * 主要功能:
 * 1. 处理捐赠交易
 * 2. 更新捐赠者和项目的相关数据
 * 3. 生成捐赠记录和事件
 * 
 * 作者: Junyin
 * 版本: 1.0
 */
'use strict';

/**
 * 执行捐赠交易
 * 
 * @param {org.mercy.charity.MakeDonation} tx - 捐赠交易
 * @transaction
 */
async function makeDonation(tx) {
    // 基本参数检查
    if (tx.amount <= 0) {
        throw new Error('捐赠金额必须大于0');
    }

    // 获取参与交易的实体
    const donor = tx.donor;
    const project = tx.project;
    
    // 检查捐赠者KYC验证状态
    if (!donor.kycVerified) {
        throw new Error('捐赠者未通过KYC验证，无法进行捐赠');
    }
    
    // 检查项目状态
    if (project.projectStatus === 'COMPLETED' || project.projectStatus === 'CANCELLED') {
        throw new Error('无法向已完成或已取消的项目进行捐赠');
    }
    
    // 创建捐赠资产
    const factory = getFactory();
    const donation = factory.newResource('org.mercy.charity', 'Donation', 
                                        generateTransactionId());
    
    donation.donor = factory.newRelationship('org.mercy.charity', 'Donor', donor.donorId);
    donation.project = factory.newRelationship('org.mercy.charity', 'Project', project.projectId);
    donation.amount = tx.amount;
    donation.timestamp = new Date();
    donation.status = 'COMPLETED';
    
    // 更新项目已筹集资金
    project.allocatedFunding += tx.amount;
    
    // 检查项目是否已完全筹集所需资金
    if (project.allocatedFunding >= project.totalFundingRequired) {
        project.fundingStatus = 'FULLY_FUNDED';
    } else {
        project.fundingStatus = 'PARTIALLY_FUNDED';
    }
    
    // 更新捐赠者总捐赠金额
    donor.totalDonatedAmount += tx.amount;
    
    // 保存所有更新
    // 1. 保存新的捐赠记录
    const donationRegistry = await getAssetRegistry('org.mercy.charity.Donation');
    await donationRegistry.add(donation);
    
    // 2. 更新项目信息
    const projectRegistry = await getAssetRegistry('org.mercy.charity.Project');
    await projectRegistry.update(project);
    
    // 3. 更新捐赠者信息
    const donorRegistry = await getParticipantRegistry('org.mercy.charity.Donor');
    await donorRegistry.update(donor);
    
    // 发出捐赠完成事件
    const event = factory.newEvent('org.mercy.charity', 'DonationCompleted');
    event.donation = donation;
    event.donor = donor;
    event.project = project;
    event.amount = tx.amount;
    event.timestamp = new Date();
    emit(event);
    
    return donation;
}

/**
 * 生成唯一的交易ID
 * 在Hyperledger Composer中使用
 * 
 * @returns {String} 唯一的交易ID
 */
function generateTransactionId() {
    return 'TX_' + Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15) + 
           '_' + new Date().getTime();
} 