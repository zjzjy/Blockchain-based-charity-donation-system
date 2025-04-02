/**
 * donationTransaction.js - 捐赠交易处理逻辑
 * 
 * 功能描述: 处理捐赠交易并更新相关资源
 * 
 * 作者: Junyin
 * 版本: MVP
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
 * 捐赠者审核里程碑并决定是否释放资金
 * 
 * @param {org.mercy.charity.ApproveMilestoneFunding} tx - 里程碑资金审批交易
 * @transaction
 */
async function approveMilestoneFunding(tx) {
    // 获取项目对象
    const project = tx.project;
    
    // 查找要更新的里程碑
    const milestoneIndex = project.milestones.findIndex(m => m.milestoneId === tx.milestoneId);
    
    if (milestoneIndex === -1) {
        throw new Error(`未找到ID为 ${tx.milestoneId} 的里程碑`);
    }
    
    // 获取要更新的里程碑
    const milestone = project.milestones[milestoneIndex];
    
    // 检查里程碑是否已完成
    if (!milestone.isCompleted) {
        throw new Error('只能为已完成的里程碑释放资金');
    }
    
    // 检查资金是否已经释放
    if (milestone.fundingReleased) {
        throw new Error('该里程碑的资金已经释放');
    }
    
    // 根据捐赠者的决定更新里程碑资金释放状态
    milestone.fundingReleased = tx.approved;
    
    // 更新项目中的里程碑
    project.milestones[milestoneIndex] = milestone;
    
    // 检查是否所有里程碑都已完成并释放资金
    const allMilestonesCompletedAndFunded = project.milestones.every(
        m => m.isCompleted && m.fundingReleased
    );
    
    // 如果所有里程碑都已完成并释放资金，将项目标记为已完成
    if (allMilestonesCompletedAndFunded) {
        project.projectStatus = 'COMPLETED';
    }
    
    // 保存项目更新
    const projectRegistry = await getAssetRegistry('org.mercy.charity.Project');
    await projectRegistry.update(project);
    
    // 发出里程碑资金释放事件
    const factory = getFactory();
    const event = factory.newEvent('org.mercy.charity', 'MilestoneFundingReleased');
    event.project = project;
    event.milestoneId = tx.milestoneId;
    event.donor = tx.donor;
    event.approved = tx.approved;
    event.timestamp = new Date();
    emit(event);
}

/**
 * 生成唯一的交易ID
 * 
 * @returns {String} 唯一的交易ID
 */
function generateTransactionId() {
    return 'TX_' + Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15) + 
           '_' + new Date().getTime();
} 