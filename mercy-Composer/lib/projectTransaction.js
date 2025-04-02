/**
 * projectTransaction.js - 项目管理交易处理逻辑
 * 
 * 功能描述: 管理慈善平台上所有项目的生命周期和相关操作。
 * 这个脚本处理项目从创建到完成的整个流程，包括状态更新、
 * 里程碑管理、资金分配等核心功能。
 * 
 * 主要功能:
 * 1. 项目状态管理
 * 2. 里程碑更新与跟踪
 * 3. 审计和合规性检查
 * 
 * 作者: Junyin
 * 版本: 1.0
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
    const validStatuses = ['REGISTERED', 'STARTED', 'IN_PROGRESS', 'NEAR_COMPLETION', 
                          'COMPLETED', 'CANCELLED', 'UNDER_REVIEW'];
    
    if (!validStatuses.includes(tx.newStatus)) {
        throw new Error('无效的项目状态值');
    }
    
    // 状态转换逻辑验证
    // 例如：已取消的项目不能重新激活，已完成的项目不能改为进行中等
    if (project.projectStatus === 'CANCELLED' && tx.newStatus !== 'CANCELLED') {
        throw new Error('已取消的项目不能更改状态');
    }
    
    if (project.projectStatus === 'COMPLETED' && 
        !['COMPLETED', 'UNDER_REVIEW'].includes(tx.newStatus)) {
        throw new Error('已完成的项目只能设置为已完成或审核中状态');
    }
    
    // 更新项目状态
    project.projectStatus = tx.newStatus;
    
    // 如果项目标记为完成，记录完成时间
    if (tx.newStatus === 'COMPLETED') {
        // 更新完成时间（这里假设项目模型中有completionDate字段）
        // 由于原始模型中没有此字段，不进行实际更新，仅做逻辑展示
        // project.completionDate = new Date();
        
        // 检查是否所有里程碑都已完成
        const incompleteMilestones = project.milestones.filter(m => !m.isCompleted);
        if (incompleteMilestones.length > 0) {
            throw new Error('项目标记为已完成前，所有里程碑必须先完成');
        }
    }
    
    // 保存项目更新
    const projectRegistry = await getAssetRegistry('org.mercy.charity.Project');
    await projectRegistry.update(project);
    
    // 发出项目状态更新事件
    const factory = getFactory();
    const event = factory.newEvent('org.mercy.charity', 'ProjectStatusUpdated');
    event.project = project;
    event.oldStatus = project.projectStatus;
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
    
    // 查找要更新的里程碑
    const milestoneIndex = project.milestones.findIndex(m => m.milestoneId === tx.milestoneId);
    
    if (milestoneIndex === -1) {
        throw new Error(`未找到ID为 ${tx.milestoneId} 的里程碑`);
    }
    
    // 获取要更新的里程碑
    const milestone = project.milestones[milestoneIndex];
    
    // 更新里程碑完成状态
    milestone.isCompleted = tx.isCompleted;
    
    // 如果标记为已完成，记录完成时间
    if (tx.isCompleted) {
        milestone.completionDate = new Date();
    } else {
        // 如果标记为未完成，清除完成时间
        milestone.completionDate = null;
    }
    
    // 更新项目中的里程碑
    project.milestones[milestoneIndex] = milestone;
    
    // 检查是否所有里程碑都已完成，如果是，可以建议将项目标记为接近完成
    const allMilestonesCompleted = project.milestones.every(m => m.isCompleted);
    if (allMilestonesCompleted && project.projectStatus !== 'COMPLETED') {
        project.projectStatus = 'NEAR_COMPLETION';
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
    event.timestamp = new Date();
    emit(event);
} 