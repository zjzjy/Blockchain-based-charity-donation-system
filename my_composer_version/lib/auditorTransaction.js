/**
 * 处理与审计员相关的交易
 */

'use strict';

/**
 * 审计员进行项目合规验证
 * @param {org.mercy.donation.VerifyProjectCompliance} verifyCompliance - 验证项目合规性交易
 * @transaction
 */
async function verifyProjectCompliance(tx) {
    const auditor = getCurrentParticipant();
    
    // 检查项目状态
    if (tx.project.status !== 'REGISTERED') {
        throw new Error('只能对已注册状态的项目进行合规验证');
    }
    
    // 更新项目合规状态
    tx.project.complianceStatus = tx.compliant ? 'VERIFIED' : 'UNVERIFIED';
    
    // 如果验证不通过，记录原因
    if (!tx.compliant && tx.reason) {
        tx.project.complianceIssues = tx.reason;
    } else if (tx.compliant) {
        // 清除之前的合规问题记录
        tx.project.complianceIssues = null;
    }
    
    // 如果有审计报告哈希，添加到项目
    if (tx.auditReportHash) {
        tx.project.auditReportHash = tx.auditReportHash;
    }
    
    // 更新项目最后更新时间
    tx.project.lastUpdated = new Date();
    
    // 保存更改
    const projectRegistry = await getAssetRegistry('org.mercy.donation.Project');
    await projectRegistry.update(tx.project);
    
    // 发出事件
    const factory = getFactory();
    const event = factory.newEvent('org.mercy.donation', 'ProjectComplianceVerified');
    event.projectId = tx.project.projectId;
    event.compliant = tx.compliant;
    event.auditorId = auditor.getIdentifier();
    event.timestamp = new Date();
    emit(event);
}

/**
 * 审计员验证里程碑
 * @param {org.mercy.donation.VerifyMilestone} verifyMilestone - 验证里程碑交易
 * @transaction
 */
async function verifyMilestone(tx) {
    const currentParticipant = getCurrentParticipant();
    
    // 检查当前用户是否为审计员
    if (!currentParticipant || currentParticipant.getFullyQualifiedType() !== 'org.mercy.donation.Auditor') {
        throw new Error('只有审计员可以验证里程碑');
    }

    const auditor = getCurrentParticipant();
    
    // 检查里程碑索引是否有效
    if (tx.milestoneIndex < 0 || tx.milestoneIndex >= tx.project.milestones.length) {
        throw new Error('无效的里程碑索引');
    }
    
    // 检查项目状态
    if (tx.project.status === 'FROZEN' || tx.project.status === 'COMPLETED' || tx.project.status === 'CANCELLED') {
        throw new Error('项目当前状态不允许验证里程碑');
    }
    
    // 检查里程碑是否已标记为完成
    if (!tx.project.milestones[tx.milestoneIndex].completed) {
        throw new Error('只能验证已标记为完成的里程碑');
    }
    
    // 标记验证结果
    tx.project.milestones[tx.milestoneIndex].verified = tx.verified;
    
    // 如果验证不通过，重置里程碑状态
    if (!tx.verified) {
        tx.project.milestones[tx.milestoneIndex].completed = false;
        tx.project.milestones[tx.milestoneIndex].completionDate = null;
        
        // 如果有评论，添加到里程碑
        if (tx.comments) {
            tx.project.milestones[tx.milestoneIndex].comments = tx.comments;
        }
    } else {
        // 检查项目是否需要状态更新
        const completedCount = tx.project.milestones.filter(m => m.completed && m.verified).length;
        const totalMilestones = tx.project.milestones.length;
        
        // 检查是否达到状态更新条件
        if (completedCount === totalMilestones) {
            // 所有里程碑完成，建议更新为接近完成状态
            tx.project.recommendedStatus = 'NEAR_COMPLETE';
        } else if (completedCount >= Math.floor(totalMilestones * 0.8)) {
            // 80%以上里程碑完成，建议更新为进行中状态（如果当前是已启动）
            if (tx.project.status === 'LAUNCHED') {
                tx.project.recommendedStatus = 'IN_PROGRESS';
            }
        }
    }
    
    // 更新项目最后更新时间
    tx.project.lastUpdated = new Date();
    
    // 保存更改
    const projectRegistry = await getAssetRegistry('org.mercy.donation.Project');
    await projectRegistry.update(tx.project);
}

/**
 * 释放项目资金
 * @param {org.mercy.donation.ReleaseFunds} releaseFunds - 释放资金交易
 * @transaction
 */
async function releaseFunds(tx) {
    const auditor = getCurrentParticipant();
    
    // 检查资金里程碑索引是否有效
    if (tx.fundingMilestoneIndex < 0 || tx.fundingMilestoneIndex >= tx.project.fundingMilestones.length) {
        throw new Error('无效的资金里程碑索引');
    }
    
    // 检查项目状态
    if (tx.project.status === 'FROZEN' || tx.project.status === 'CANCELLED') {
        throw new Error('项目当前状态不允许释放资金');
    }
    
    // 检查资金里程碑是否已释放
    if (tx.project.fundingMilestones[tx.fundingMilestoneIndex].released) {
        throw new Error('该资金里程碑已释放');
    }
    
    // 检查释放金额是否合法
    if (tx.amount <= 0 || tx.amount > tx.project.fundingMilestones[tx.fundingMilestoneIndex].amount) {
        throw new Error('释放金额无效');
    }
    
    // 根据项目状态验证资金释放条件
    if (tx.project.status === 'REGISTERED') {
        throw new Error('项目必须先启动才能释放资金');
    } else if (tx.project.status === 'LAUNCHED' && tx.fundingMilestoneIndex > 0) {
        throw new Error('项目刚启动阶段只能释放第一笔资金');
    } else if (tx.project.status === 'IN_PROGRESS' && tx.fundingMilestoneIndex > 1) {
        throw new Error('项目进行中阶段只能释放第二笔资金');
    }
    
    // 更新资金里程碑
    tx.project.fundingMilestones[tx.fundingMilestoneIndex].released = true;
    tx.project.fundingMilestones[tx.fundingMilestoneIndex].releaseDate = new Date();
    
    // 记录释放总额
    tx.project.totalReleasedAmount = (tx.project.totalReleasedAmount || 0) + tx.amount;
    
    // 更新项目最后更新时间
    tx.project.lastUpdated = new Date();
    
    // 保存更改
    const projectRegistry = await getAssetRegistry('org.mercy.donation.Project');
    await projectRegistry.update(tx.project);
    
    // 发出事件
    const factory = getFactory();
    const event = factory.newEvent('org.mercy.donation', 'FundsReleased');
    event.projectId = tx.project.projectId;
    event.amount = tx.amount;
    event.auditorId = auditor.getIdentifier();
    event.timestamp = new Date();
    emit(event);
}

/**
 * 冻结项目
 * @param {org.mercy.donation.FreezeProject} freezeProject - 冻结项目交易
 * @transaction
 */
async function freezeProject(tx) {
    const auditor = getCurrentParticipant();
    
    // 检查项目状态
    if (tx.project.status === 'COMPLETED' || tx.project.status === 'CANCELLED') {
        throw new Error('已完成或已取消的项目不能冻结');
    }
    
    // 检查是否已经冻结
    if (tx.project.status === 'FROZEN') {
        throw new Error('项目已处于冻结状态');
    }
    
    // 记录冻结前状态
    tx.project.statusBeforeFreeze = tx.project.status;
    
    // 更新项目状态
    tx.project.status = 'FROZEN';
    tx.project.fundingStatus = 'FROZEN';
    tx.project.freezeReason = tx.reason;
    tx.project.freezeInitiator = auditor.getIdentifier();
    tx.project.freezeTime = new Date();
    tx.project.lastUpdated = new Date();
    
    // 保存更改
    const projectRegistry = await getAssetRegistry('org.mercy.donation.Project');
    await projectRegistry.update(tx.project);
    
    // 发出事件
    const factory = getFactory();
    const event = factory.newEvent('org.mercy.donation', 'ProjectFrozen');
    event.projectId = tx.project.projectId;
    event.reason = tx.reason;
    event.initiatorId = auditor.getIdentifier();
    event.timestamp = new Date();
    emit(event);
}

/**
 * 解冻项目
 * @param {org.mercy.donation.UnfreezeProject} unfreezeProject - 解冻项目交易
 * @transaction
 */
async function unfreezeProject(tx) {
    const auditor = getCurrentParticipant();
    const donor = getCurrentParticipant();
    
    // 检查项目状态
    if (tx.project.status !== 'FROZEN') {
        throw new Error('只能解冻处于冻结状态的项目');
    }
    
    // 检查是否有恢复前状态记录
    if (!tx.project.statusBeforeFreeze) {
        // 如果没有记录，默认恢复到已启动状态
        tx.project.status = 'LAUNCHED';
    } else {
        // 恢复到冻结前状态
        tx.project.status = tx.project.statusBeforeFreeze;
    }
    
    // 恢复资金状态
    if (tx.project.allocatedAmount >= tx.project.totalRequiredAmount) {
        tx.project.fundingStatus = 'COMPLETED';
    } else if (tx.project.allocatedAmount >= tx.project.totalRequiredAmount * 0.8) {
        tx.project.fundingStatus = 'PARTIAL';
    } else {
        tx.project.fundingStatus = 'PARTIAL';
    }
    
    // 清除冻结相关信息
    tx.project.statusBeforeFreeze = null;
    tx.project.freezeReason = null;
    tx.project.freezeInitiator = null;
    tx.project.freezeTime = null;
    tx.project.unfreezeReason = tx.reason;
    tx.project.unfreezeTime = new Date();
    tx.project.lastUpdated = new Date();
    
    // 保存更改
    const projectRegistry = await getAssetRegistry('org.mercy.donation.Project');
    await projectRegistry.update(tx.project);
    
    // 发出事件
    const factory = getFactory();
    const event = factory.newEvent('org.mercy.donation', 'ProjectUnfrozen');
    event.projectId = tx.project.projectId;
    event.auditorId = auditor.getIdentifier();
    event.donorId = donor.getIdentifier();
    event.timestamp = new Date();
    emit(event);
}