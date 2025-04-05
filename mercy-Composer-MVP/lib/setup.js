/**
 * setup.js - 初始化脚本
 * 创建默认的项目所有者和捐赠者
 */
'use strict';

/**
 * 设置演示环境，创建默认参与者
 * @param {org.mercy.charity.SetupDemo} tx 设置演示环境交易
 * @transaction
 */
async function setupDemo(tx) {
    // 获取工厂和注册表
    const factory = getFactory();
    const donorRegistry = await getParticipantRegistry('org.mercy.charity.Donor');
    const ownerRegistry = await getParticipantRegistry('org.mercy.charity.ProjectOwner');
    
    // 创建默认捐赠者
    const donor = factory.newResource('org.mercy.charity', 'Donor', 'DONOR1');
    donor.name = "李捐赠";
    donor.email = "donor@example.com";
    donor.phone = "13900139000";
    donor.walletAddress = "0x1234567890abcdef";
    donor.totalDonatedAmount = 0.0;
    donor.registrationDate = new Date("2023-04-02T10:00:00.000Z");
    
    // 创建默认项目所有者
    const owner = factory.newResource('org.mercy.charity', 'ProjectOwner', 'OWNER1');
    owner.name = "张项目";
    owner.email = "owner@example.com";
    owner.phone = "13800138000";
    owner.projectIds = [];
    
    // 保存到参与者注册表
    await donorRegistry.add(donor);
    await ownerRegistry.add(owner);
    
    // 返回创建的参与者
    return { donor, owner };
} 