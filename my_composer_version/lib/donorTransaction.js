/**
 * 处理与捐赠者相关的交易
 */

'use strict';

/**
 * 注册新捐赠者
 * @param {org.mercy.donation.RegisterDonor} registerDonor - 注册捐赠者交易
 * @transaction
 */
async function registerDonor(tx) {
  
    // 获取参与者注册表
    const participantRegistry = await getParticipantRegistry('org.mercy.donation.Donor');
    
    // 生成唯一ID
    const donorId = 'D' + Math.floor(Math.random() * 10000);
    
    // 创建新捐赠者
    const factory = getFactory();
    const donor = factory.newResource('org.mercy.donation', 'Donor', donorId);
    
    donor.name = tx.name;
    donor.email = tx.email;
    donor.phoneNumber = tx.phoneNumber;
    donor.walletAddress = tx.walletAddress;
    donor.preferredCategories = tx.preferredCategories;
    donor.totalDonationAmount = 0.0;
    donor.registrationTimestamp = new Date();
    donor.status = 'ACTIVE';
    
    // 检查钱包地址唯一性
    const existingDonors = await participantRegistry.getAll();
    const walletExists = existingDonors.some(d => d.walletAddress === tx.walletAddress);
    if (walletExists) {
        throw new Error('钱包地址已存在，请使用其他地址');
    }
    
    // 保存到参与者注册表
    await participantRegistry.add(donor);
    
    // 发出事件
    const event = factory.newEvent('org.mercy.donation', 'DonorRegistered');
    event.donorId = donorId;
    event.email = tx.email;
    event.timestamp = new Date();
    emit(event);
    
    return donor;
}

/**
 * 更新捐赠者状态
 * @param {org.mercy.donation.UpdateDonorStatus} updateStatus - 更新捐赠者状态交易
 * @transaction
 */
async function updateDonorStatus(tx) {
    // 获取参与者注册表
    const participantRegistry = await getParticipantRegistry('org.mercy.donation.Donor');
    
    // 更新状态
    tx.donor.status = tx.newStatus;
    
    // 保存更改
    await participantRegistry.update(tx.donor);
    
    // 如果是黑名单状态，处理相关捐赠
    if (tx.newStatus === 'BLACKLISTED') {
        // 获取捐赠注册表
        const donationRegistry = await getAssetRegistry('org.mercy.donation.Donation');
        
        // 查找该捐赠者的所有进行中捐赠
        const allDonations = await donationRegistry.getAll();
        const activeDonations = allDonations.filter(d => 
            d.donor.getIdentifier() === tx.donor.getIdentifier() && 
            (d.status === 'INITIATED' || d.status === 'PARTIAL')
        );
        
        // 将捐赠状态更新为已取消
        for (let donation of activeDonations) {
            donation.status = 'CANCELLED';
            await donationRegistry.update(donation);
        }
    }
}