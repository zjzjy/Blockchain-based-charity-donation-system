/**
 * projectTransaction.js - 项目管理交易处理逻辑
 * 
 * 功能描述: 管理项目生命周期和里程碑
 * 
 * 作者: Junyin
 * 版本: MVP
 */
'use strict';

/**
 * 更新项目状态
 * 
 * @param {org.mercy.charity.UpdateProjectStatus} tx - 项目状态更新交易
 * @transaction
 */
async function updateProjectStatus(tx) {
    // 获取项目对象
    const project = tx.project;
    
    // 验证状态有效性
    const validStatuses = ['REGISTERED', 'STARTED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];
    
    if (!validStatuses.includes(tx.newStatus)) {
        throw new Error('无效的项目状态值');
    }
    
    // 检查是否为项目所有者 (在ACL中也有验证)
    const currentParticipant = getCurrentParticipant();
    if (project.owner.getIdentifier() !== currentParticipant.getIdentifier()) {
        throw new Error('只有项目所有者可以更新项目状态');
    }
    
    // 状态转换逻辑验证
    if (project.projectStatus === 'CANCELLED' && tx.newStatus !== 'CANCELLED') {
        throw new Error('已取消的项目不能更改状态');
    }
    
    if (project.projectStatus === 'COMPLETED' && tx.newStatus !== 'COMPLETED') {
        throw new Error('已完成的项目不能更改状态');
    }
    
    // 更新项目状态
    const oldStatus = project.projectStatus;
    project.projectStatus = tx.newStatus;
    
    // 保存项目更新
    const projectRegistry = await getAssetRegistry('org.mercy.charity.Project');
    await projectRegistry.update(project);
    
    // 发出项目状态更新事件
    const factory = getFactory();
    const event = factory.newEvent('org.mercy.charity', 'ProjectStatusUpdated');
    event.project = project;
    event.oldStatus = oldStatus;
    event.newStatus = tx.newStatus;
    event.timestamp = new Date();
    emit(event);
}

/**
 * 更新项目里程碑状态
 * 
 * @param {org.mercy.charity.UpdateMilestone} tx - 里程碑更新交易
 * @transaction
 */
async function updateMilestone(tx) {
    // 获取项目对象
    const project = tx.project;
    
    // 检查是否为项目所有者 (在ACL中也有验证)
    const currentParticipant = getCurrentParticipant();
    if (project.owner.getIdentifier() !== currentParticipant.getIdentifier()) {
        throw new Error('只有项目所有者可以更新里程碑');
    }
    
    // 查找要更新的里程碑
    const milestoneIndex = project.milestones.findIndex(m => m.milestoneId === tx.milestoneId);
    
    if (milestoneIndex === -1) {
        throw new Error(`未找到ID为 ${tx.milestoneId} 的里程碑`);
    }
    
    // 获取要更新的里程碑
    const milestone = project.milestones[milestoneIndex];
    
    // 检查是否尝试取消已释放资金的里程碑
    if (milestone.fundingReleased && milestone.isCompleted && !tx.isCompleted) {
        throw new Error('已释放资金的里程碑不能标记为未完成');
    }
    
    // 更新里程碑完成状态
    milestone.isCompleted = tx.isCompleted;
    
    // 如果提供了证据哈希，更新它
    if (tx.evidenceHash) {
        milestone.evidenceHash = tx.evidenceHash;
    }
    
    // 如果标记为已完成，记录完成时间
    if (tx.isCompleted) {
        milestone.completionDate = new Date();
    } else {
        // 如果标记为未完成，清除完成时间
        milestone.completionDate = null;
    }
    
    // 更新项目中的里程碑
    project.milestones[milestoneIndex] = milestone;
    
    // 自动更新项目状态
    // 如果项目状态是REGISTERED或STARTED，并且有里程碑被标记为已完成，将状态更新为IN_PROGRESS
    if ((project.projectStatus === 'REGISTERED' || project.projectStatus === 'STARTED') && tx.isCompleted) {
        project.projectStatus = 'IN_PROGRESS';
    }
    
    // 保存项目更新
    const projectRegistry = await getAssetRegistry('org.mercy.charity.Project');
    await projectRegistry.update(project);
    
    // 发出里程碑更新事件
    const factory = getFactory();
    const event = factory.newEvent('org.mercy.charity', 'MilestoneUpdated');
    event.project = project;
    event.milestoneId = tx.milestoneId;
    event.isCompleted = tx.isCompleted;
    event.evidenceHash = tx.evidenceHash;
    event.timestamp = new Date();
    emit(event);
} 