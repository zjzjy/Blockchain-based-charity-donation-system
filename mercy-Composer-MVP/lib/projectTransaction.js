/**
 * projectTransaction.js - 项目交易处理逻辑
 * 
 * 功能描述: 处理项目相关交易
 * 
 * 作者: Junyin、Xiyue
 * 版本: 2.1.1
 */
'use strict';

/**
 * 更新项目状态
 * 
 * @param {org.mercy.charity.UpdateProjectStatus} tx - 项目状态更新交易
 * @transaction
 */
async function updateProjectStatus(tx) {
    // 获取项目
    const project = tx.project;
    
    // 验证新状态是否有效
    const validStatuses = ['REGISTERED', 'STARTED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];
    if (!validStatuses.includes(tx.newStatus)) {
        throw new Error('无效的项目状态');
    }
    
    // 记录旧状态
    const oldStatus = project.projectStatus;
    
    // 更新项目状态
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
    
    // 调试输出
    console.log('项目所有者ID:', project.owner.getIdentifier());
    
    // 检查交易中指定的项目所有者是否有效
    if (!project.owner) {
        throw new Error('项目没有指定所有者');
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