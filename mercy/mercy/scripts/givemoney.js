/**
 * 捐赠交易脚本 (makeDonation.js)
 * --------------------------------------------
 * 
 * 功能概述:
 * 此脚本用于处理捐赠者向慈善项目进行捐赠的交易流程。
 * 捐赠交易将记录在区块链上，确保资金流向透明可追踪。
 * 
 * 主要职责:
 * 1. 验证捐赠者身份和KYC状态
 * 2. 验证项目状态是否可接受捐赠
 * 3. 创建捐赠交易记录
 * 4. 更新项目的资金状态
 * 5. 提供交易反馈和确认
 * 
 * 使用方法:
 * node makeDonation.js <donorId> <projectId> <amount> [description]
 * 
 * 参数说明:
 * - donorId: 捐赠者ID
 * - projectId: 接受捐赠的项目ID
 * - amount: 捐赠金额
 * - description: (可选) 捐赠描述或留言
 */

'use strict';

// 导入必要的模块
const { Gateway, Wallets } = require('fabric-network'); // Hyperledger Fabric网络交互模块
const path = require('path');                          // 路径处理模块
const fs = require('fs');                             // 文件系统模块
require('dotenv').config({ path: path.resolve(__dirname, '../config/.env') }); // 加载环境变量

/**
 * 捐赠交易主函数
 * @param {String} donorId - 捐赠者ID
 * @param {String} projectId - 项目ID
 * @param {String} amount - 捐赠金额
 * @param {String} description - 捐赠描述(可选)
 */
async function makeDonation(donorId, projectId, amount, description = '') {
    try {
        // 第一步: 加载网络配置
        console.log('正在加载网络配置...');
        const ccpPath = path.resolve(__dirname, '../config/connection.json');
        const ccp = JSON.parse(fs.readFileSync(ccpPath, 'utf8'));

        // 第二步: 创建或加载钱包
        console.log('正在加载身份钱包...');
        const walletPath = path.join(__dirname, '../wallet');
        const wallet = await Wallets.newFileSystemWallet(walletPath);
        console.log(`钱包路径: ${walletPath}`);

        // 第三步: 检查管理员身份或DonorOrg的管理员身份是否存在
        // 优先检查DonorOrg特定管理员，因为捐赠操作应该由DonorOrg背书
        const donorAdminIdentity = await wallet.get('admin-donororg');
        const adminIdentity = await wallet.get('admin');
        
        if (!donorAdminIdentity && !adminIdentity) {
            console.log('错误: 未找到DonorOrg管理员或默认管理员身份');
            console.log('请先运行enrollAdmin.js程序注册管理员身份');
            return;
        }
        
        // 确定使用哪个管理员身份
        let adminId = 'admin';
        if (donorAdminIdentity) {
            console.log('使用DonorOrg组织管理员身份...');
            adminId = 'admin-donororg';
        } else {
            console.log('使用默认管理员身份...');
        }

        // 第四步: 连接到区块链网络
        console.log('正在连接到Fabric网关...');
        const gateway = new Gateway();
        await gateway.connect(ccp, { 
            wallet, 
            identity: adminId, 
            discovery: { enabled: true, asLocalhost: true } 
        });

        // 第五步: 获取通道和智能合约
        // 从环境变量获取通道名称，默认为'mercychannel'
        const channelName = process.env.CHANNEL_NAME || 'mercychannel';
        console.log(`连接到通道: ${channelName}`);
        const network = await gateway.getNetwork(channelName);
        
        // 获取所需的三个合约实例
        const donationContract = network.getContract('mercy', 'org.mercy.charity.donation');
        const donorContract = network.getContract('mercy', 'org.mercy.charity.donor');
        const projectContract = network.getContract('mercy', 'org.mercy.charity.project');

        // 第六步: 验证输入数据
        console.log('正在验证捐赠数据...');
        
        // 验证捐赠金额为正数
        const donationAmount = parseFloat(amount);
        if (isNaN(donationAmount) || donationAmount <= 0) {
            throw new Error('捐赠金额必须为正数');
        }

        // 第七步: 验证捐赠者身份和KYC状态
        console.log(`正在验证捐赠者 ${donorId} 的身份...`);
        try {
            const donorResult = await donorContract.evaluateTransaction('queryDonor', donorId);
            const donor = JSON.parse(donorResult.toString());
            
            if (!donor.kycVerified) {
                console.log('错误: 捐赠者未通过KYC验证，不能进行捐赠');
                console.log('请先运行 verifyDonor.js 完成KYC验证');
                return;
            }
            console.log('捐赠者身份验证通过');
        } catch (error) {
            console.log(`错误: 捐赠者 ${donorId} 不存在`);
            console.log('请先运行 registerDonor.js 注册捐赠者');
            return;
        }

        // 第八步: 验证项目状态
        console.log(`正在验证项目 ${projectId} 的状态...`);
        let project;
        try {
            const projectResult = await projectContract.evaluateTransaction('queryProject', projectId);
            project = JSON.parse(projectResult.toString());
            
            if (project.status !== 'REGISTERED' && project.status !== 'IN_PROGRESS') {
                console.log(`错误: 项目当前状态为 ${project.status}，不接受捐赠`);
                return;
            }
            
            if (project.complianceStatus !== 'APPROVED') {
                console.log(`错误: 项目合规状态为 ${project.complianceStatus}，不接受捐赠`);
                return;
            }
            console.log('项目状态验证通过');
        } catch (error) {
            console.log(`错误: 项目 ${projectId} 不存在`);
            return;
        }

        // 第九步: 生成唯一交易ID
        const timestamp = new Date().toISOString().replace(/[-:.TZ]/g, '');
        const transactionId = `DON_${donorId}_${projectId}_${timestamp}`;
        console.log(`生成交易ID: ${transactionId}`);

        // 第十步: 提交交易 - 执行捐赠
        console.log('正在处理捐赠交易...');
        const result = await donationContract.submitTransaction(
            'makeDonation',
            transactionId,
            donorId,
            projectId,
            amount.toString(),
            description
        );
        
        // 第十一步: 解析并显示结果
        console.log('交易已提交，正在获取结果...');
        const donation = JSON.parse(result.toString());

        // 打印捐赠信息
        console.log('\n✅ 捐赠成功！');
        console.log('====================================');
        console.log(`🆔 交易ID: ${donation.donationId}`);
        console.log(`👤 捐赠者: ${donation.donorId}`);
        console.log(`📝 项目: ${donation.projectId} (${project.name})`);
        console.log(`💰 金额: ${donation.amount}`);
        console.log(`📅 日期: ${donation.donationDate}`);
        console.log(`📄 描述: ${donation.description || '无'}`);
        console.log(`🚦 状态: ${donation.status}`);
        console.log('====================================');
        
        // 显示项目剩余募资需求
        const remainingFunding = parseFloat(project.totalFundingRequired) - parseFloat(project.fundingReceived || 0) - donationAmount;
        if (remainingFunding <= 0) {
            console.log('\n🎉 恭喜！您的捐赠已帮助该项目达成筹款目标！');
        } else {
            console.log(`\n📊 项目还需筹集: ${remainingFunding} 才能达成目标`);
        }
        
        // 第十二步: 断开网关连接
        await gateway.disconnect();
        console.log('已断开与网关的连接');

    } catch (error) {
        console.error(`❌ 捐赠失败: ${error.message}`);
        if (error.stack) {
            console.error('详细错误信息:');
            console.error(error.stack);
        }
        process.exit(1);
    }
}

// 命令行参数处理
const args = process.argv.slice(2);
if (args.length < 3 || args.length > 4) {
    console.log('用法: node makeDonation.js <donorId> <projectId> <amount> [description]');
    console.log('示例: node makeDonation.js donor001 proj001 1000 "支持儿童教育项目"');
    process.exit(1);
}

// 解析参数
const donorId = args[0];
const projectId = args[1];
const amount = args[2];
const description = args.length === 4 ? args[3] : '';

// 执行主函数
makeDonation(donorId, projectId, amount, description)
    .then(() => {
        console.log('捐赠流程已完成');
    })
    .catch((e) => {
        console.log('捐赠过程中发生错误: ' + e);
    }); 