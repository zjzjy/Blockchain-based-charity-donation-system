/**
 * 处理与捐赠相关的交易
 */

'use strict';

/**
 * 进行捐赠
 * @param {org.mercy.donation.MakeDonation} makeDonation - 捐赠交易
 * @transaction
 */
async function makeDonation(tx) {
    const donor = getCurrentParticipant();
    
    // 验证捐赠者状态
    if (donor.status !== 'ACTIVE') {
        throw new Error('捐赠者账户状态异常，无法完成捐赠');
    }
    
    // 验证项目状态
    if (tx.project.complianceStatus === 'UNVERIFIED' || tx.project.status === 'FROZEN' || tx.project.status === 'COMPLETED' || tx.project.status === 'CANCELLED') {
        throw new Error('项目状态不允许接受捐赠');
    }
    
    // 验证是否超捐
    if (tx.amount > tx.project.totalRequiredAmount-tx.project.allocatedAmount) {
        throw new Error('捐赠金额超过项目剩余资金');
    }
    
    // 生成唯一交易ID
    const transactionId = 'TC' + Math.floor(Math.random() * 10000);
    
    // 创建捐赠资产
    const factory = getFactory();
    const donation = factory.newResource('org.mercy.donation', 'Donation', transactionId);
    
    donation.amount = tx.amount;
    donation.timestamp = new Date();
    donation.status = 'COMPLETED'; // 默认捐赠完成状态
    donation.donor = donor;
    donation.project = tx.project;
    
    // 更新项目已分配资金
    tx.project.allocatedAmount += tx.amount;
    
    // 更新项目资金状态
    const totalRequired = tx.project.totalRequiredAmount;
    const allocated = tx.project.allocatedAmount;
    
    if (allocated >= totalRequired) {
        tx.project.fundingStatus = 'COMPLETED';
    } else if (allocated >= totalRequired * 0.8) {
        tx.project.fundingStatus = 'PARTIAL';
        // 项目资金达到80%，更新项目状态为进行中（如果当前不是更高状态）
        if (tx.project.status === 'LAUNCHED') {
            tx.project.status = 'IN_PROGRESS';
            tx.project.lastUpdated = new Date();
        }
    } else {
        tx.project.fundingStatus = 'PARTIAL';
    }
    
    // 更新项目最后更新时间
    tx.project.lastUpdated = new Date();
    
    // 更新捐赠者总捐赠金额
    donor.totalDonationAmount += tx.amount;
    
    // 保存各项更新 - 使用系统身份
    const donationRegistry = await getAssetRegistry('org.mercy.donation.Donation');
    await donationRegistry.add(donation);
    
    const projectRegistry = await getAssetRegistry('org.mercy.donation.Project');
    await projectRegistry.update(tx.project);
    
    const donorRegistry = await getParticipantRegistry('org.mercy.donation.Donor');
    await donorRegistry.update(donor);
    
    // 发出事件
    const event = factory.newEvent('org.mercy.donation', 'DonationMade');
    event.transactionId = transactionId;
    event.amount = tx.amount;
    event.donorId = donor.getIdentifier();
    event.projectId = tx.project.projectId;
    event.timestamp = new Date();
    emit(event);
    
    return donation;
}