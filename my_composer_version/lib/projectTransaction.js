/**
 * 处理与项目相关的交易
 */

'use strict';

/**
 * 注册新项目
 * @param {org.mercy.donation.RegisterProject} registerProject - 注册项目交易
 * @transaction
 */
async function registerProject(tx) {
    const projectOwner = getCurrentParticipant();
    
    // 获取资产注册表
    const projectRegistry = await getAssetRegistry('org.mercy.donation.Project');
    
    // 生成唯一ID
    const projectId = '000' + Math.floor(Math.random() * 10000);
    
    // 创建新项目
    const factory = getFactory();
    const project = factory.newResource('org.mercy.donation', 'Project', projectId);
    
    project.name = tx.name;
    project.description = tx.description;
    project.startDate = tx.startDate;
    project.endDate = tx.endDate;
    project.status = 'REGISTERED';
    project.categories = tx.categories;
    project.totalRequiredAmount = tx.totalRequiredAmount;
    project.allocatedAmount = 0.0;
    project.fundingStatus = 'INITIATED';
    project.milestones = tx.milestones;
    project.fundingMilestones = tx.fundingMilestones;
    project.teamMembers = tx.teamMembers;
    project.partners = tx.partners;
    project.contactInfo = tx.contactInfo;
    project.complianceStatus = 'UNVERIFIED';
    project.regulatoryInfo = tx.regulatoryInfo;
    project.owner = projectOwner;
    project.lastUpdated = new Date();
    
    // 保存到资产注册表
    await projectRegistry.add(project);
    
    // 发出事件
    const event = factory.newEvent('org.mercy.donation', 'ProjectRegistered');
    event.projectId = projectId;
    event.name = tx.name;
    event.timestamp = new Date();
    emit(event);
    
    return project;
}

/**
 * 更新项目状态
 * @param {org.mercy.donation.UpdateProjectStatus} updateStatus - 更新项目状态交易
 * @transaction
 */
async function updateProjectStatus(tx) {
    const auditor = getCurrentParticipant();
    
    // 验证状态转换合法性
    const validTransitions = {
        'REGISTERED': ['LAUNCHED', 'FROZEN', 'CANCELLED'],
        'LAUNCHED': ['IN_PROGRESS', 'FROZEN', 'CANCELLED','COMPLETED'],
        'IN_PROGRESS': ['NEAR_COMPLETE', 'FROZEN', 'CANCELLED','COMPLETED'],
        'NEAR_COMPLETE': ['COMPLETED', 'FROZEN', 'CANCELLED','COMPLETED'],
        'FROZEN': ['REGISTERED', 'LAUNCHED', 'IN_PROGRESS', 'NEAR_COMPLETE', 'CANCELLED'],
        'COMPLETED': [], // 终态，不可更改
        'CANCELLED': [] // 终态，不可更改
    };
    
    if (!validTransitions[tx.project.status].includes(tx.newStatus)) {
        throw new Error(`无效的状态转换: 从 ${tx.project.status} 到 ${tx.newStatus}`);
    }
    
    // 记录旧状态用于事件发出
    const oldStatus = tx.project.status;
    
    // 特殊状态处理
    if (tx.newStatus === 'LAUNCHED') {
        // 确保注册完成后才能启动
        if (tx.project.complianceStatus !== 'VERIFIED') {
            throw new Error('项目必须通过合规验证才能启动');
        }
        
        // 检查资金状态
        if (tx.project.allocatedAmount < 0.5 * tx.project.totalRequiredAmount) {
            throw new Error('项目必须有50%初始资金才能启动');
        }
    } 
    else if (tx.newStatus === 'IN_PROGRESS') {

         // 检查资金状态
         if (tx.project.allocatedAmount < 0.8*tx.project.totalRequiredAmount) {
            throw new Error('项目必须有80%初始资金才能进行中状态');
        }
    }
    else if (tx.newStatus === 'COMPLETED') {
        // 确保所有里程碑都已完成
        const allCompleted = tx.project.milestones.every(m => m.completed);
        if (!allCompleted) {
            throw new Error('所有里程碑必须完成才能将项目标记为已完成');
        }
        
        // 检查资金状态
        if (tx.project.allocatedAmount < tx.project.totalRequiredAmount) {
            throw new Error('项目资金必须达到目标才能标记为已完成');
        }
    }


    // 如果从冻结状态恢复，需要验证原因
    if (tx.project.status === 'FROZEN' && tx.newStatus !== 'CANCELLED') {
        if (!tx.reason || tx.reason.trim() === '') {
            throw new Error('从冻结状态恢复项目需要提供有效原因');
        }
    }
    
    // 只更新审计员批准的状态，实际状态更新需要捐赠者最终确认
    // 但记录审计员的审核结果
    tx.project.pendingStatus = tx.newStatus;
    tx.project.pendingStatusAuditor = auditor.getIdentifier();
    tx.project.pendingStatusReason = tx.reason;
    tx.project.lastUpdated = new Date();
    
    // 保存更改
    const projectRegistry = await getAssetRegistry('org.mercy.donation.Project');
    await projectRegistry.update(tx.project);
    
    // 发出事件（注意：这只是审计员审核阶段，不是最终状态更新）
    const factory = getFactory();
    const event = factory.newEvent('org.mercy.donation', 'ProjectStatusUpdated');
    event.projectId = tx.project.projectId;
    event.oldStatus = oldStatus;
    event.newStatus = oldStatus; 
    event.auditorId = auditor.getIdentifier();
    event.timestamp = new Date();
    emit(event);
}

/**
 * 捐赠者批准项目状态更新
 * @param {org.mercy.donation.ApproveProjectStatusUpdate} approveStatus - 批准状态更新交易
 * @transaction
 */
async function approveProjectStatusUpdate(tx) {
    const donor = getCurrentParticipant();
    
    // 检查项目是否有待批准的状态更新
    if (!tx.project.pendingStatus) {
        throw new Error('项目没有待批准的状态更新');
    }
    
    // 如果批准，更新项目状态
    if (tx.approved) {
        // 记录旧状态用于事件发出
        const oldStatus = tx.project.status;
        
        // 更新状态
        tx.project.status = tx.project.pendingStatus;
        
        // 如果状态是已完成或已取消，更新资金状态
        if (tx.project.status === 'COMPLETED') {
            tx.project.fundingStatus = 'COMPLETED';
        } else if (tx.project.status === 'CANCELLED') {
            tx.project.fundingStatus = 'CANCELLED';
        } else if (tx.project.status === 'FROZEN') {
            tx.project.fundingStatus = 'FROZEN';
        }
        
        // 清除待批准状态
        tx.project.pendingStatus = null;
        tx.project.pendingStatusAuditor = null;
        tx.project.pendingStatusReason = null;
        tx.project.lastUpdated = new Date();
        
        // 保存更改
        const projectRegistry = await getAssetRegistry('org.mercy.donation.Project');
        await projectRegistry.update(tx.project);
        
        // 发出事件
        const factory = getFactory();
        const event = factory.newEvent('org.mercy.donation', 'ProjectStatusUpdated');
        event.projectId = tx.project.projectId;
        event.oldStatus = oldStatus;
        event.newStatus = tx.project.status;
        event.auditorId = 'APPROVED_BY_DONOR'; // 标记为捐赠者批准
        event.timestamp = new Date();
        emit(event);
    } else {
        // 拒绝状态更新，清除待批准状态
        tx.project.pendingStatus = null;
        tx.project.pendingStatusAuditor = null;
        tx.project.pendingStatusReason = null;
        tx.project.comments = tx.comments;
        tx.project.lastUpdated = new Date();
        
        // 保存更改
        const projectRegistry = await getAssetRegistry('org.mercy.donation.Project');
        await projectRegistry.update(tx.project);
    }
}

/**
 * 更新项目里程碑
 * @param {org.mercy.donation.UpdateMilestone} updateMilestone - 更新里程碑交易
 * @transaction
 */
async function updateMilestone(tx) {
    const owner = getCurrentParticipant();
    
    // 验证项目所有者
    if (owner.getIdentifier() !== tx.project.owner.getIdentifier()) {
        throw new Error('只有项目所有者可以更新里程碑');
    }
    
    // 检查里程碑索引是否有效
    if (tx.milestoneIndex < 0 || tx.milestoneIndex >= tx.project.milestones.length) {
        throw new Error('无效的里程碑索引');
    }
    
    // 检查项目状态
    if (tx.project.status === 'FROZEN' || tx.project.status === 'COMPLETED' || tx.project.status === 'CANCELLED') {
        throw new Error('项目当前状态不允许更新里程碑');
    }
    
    // 检查前一个里程碑是否完成
    if (tx.milestoneIndex > 0 && !tx.project.milestones[tx.milestoneIndex-1].completed) {
        throw new Error('前一个里程碑必须完成才能更新当前里程碑');
    }  
    
    // 更新里程碑
    tx.project.milestones[tx.milestoneIndex].completed = tx.completed;
    
    if (tx.completed) {
        // 如果标记为已完成，记录完成日期
        tx.project.milestones[tx.milestoneIndex].completionDate = new Date();
        
        // 可选地添加验证文档
        if (tx.verificationDocument) {
            tx.project.milestones[tx.milestoneIndex].verificationDocument = tx.verificationDocument;
        }
    }
    
    // 更新项目最后更新时间
    tx.project.lastUpdated = new Date();
    
    // 保存更改
    const projectRegistry = await getAssetRegistry('org.mercy.donation.Project');
    await projectRegistry.update(tx.project);
    
    // 发出事件
    const factory = getFactory();
    const event = factory.newEvent('org.mercy.donation', 'MilestoneUpdated');
    event.projectId = tx.project.projectId;
    event.milestoneIndex = tx.milestoneIndex;
    event.completed = tx.completed;
    event.ownerID = owner.getIdentifier();
    event.timestamp = new Date();
    emit(event);
}