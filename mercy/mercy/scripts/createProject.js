/**
 * 项目创建脚本 (createProject.js)
 * --------------------------------------------
 * 
 * 功能概述:
 * 此脚本用于在区块链网络上创建新的慈善项目，是项目所有者发起慈善项目的关键步骤。
 * 创建的项目信息将存储在区块链上，为后续的捐赠和资金跟踪做准备。
 * 
 * 主要职责:
 * 1. 验证并创建新的慈善项目
 * 2. 检查项目ID的唯一性
 * 3. 将项目信息记录到区块链账本
 * 4. 与项目所有者关联
 * 5. 提供友好的命令行交互和结果反馈
 * 
 * 使用方法:
 * node createProject.js <projectId> <name> <description> <startDate> <endDate> <categories> <totalFundingRequired> <projectOwnerId>
 * 
 * 参数说明:
 * - projectId: 项目唯一标识符
 * - name: 项目名称
 * - description: 项目描述
 * - startDate: 项目开始日期 (YYYY-MM-DD格式)
 * - endDate: 项目结束日期 (YYYY-MM-DD格式)
 * - categories: 项目类别，以逗号分隔的列表
 * - totalFundingRequired: 所需资金总额
 * - projectOwnerId: 项目所有者ID
 */

'use strict';

// 导入必要的模块
const { Gateway, Wallets } = require('fabric-network'); // Hyperledger Fabric网络交互模块
const path = require('path');                          // 路径处理模块
const fs = require('fs');                             // 文件系统模块
require('dotenv').config({ path: path.resolve(__dirname, '../config/.env') }); // 加载环境变量

/**
 * 项目创建主函数
 * @param {String} projectId - 项目ID
 * @param {String} name - 项目名称
 * @param {String} description - 项目描述
 * @param {String} startDate - 开始日期 (YYYY-MM-DD)
 * @param {String} endDate - 结束日期 (YYYY-MM-DD)
 * @param {Array} categories - 项目类别数组
 * @param {String} totalFundingRequired - 所需资金总额
 * @param {String} projectOwnerId - 项目所有者ID
 */
async function createProject(projectId, name, description, startDate, endDate, categories, totalFundingRequired, projectOwnerId) {
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

        // 第三步: 检查管理员身份或CharityOrg的管理员身份是否存在
        // 优先检查CharityOrg特定管理员，因为项目创建应该由CharityOrg背书
        const charityAdminIdentity = await wallet.get('admin-charityorg');
        const adminIdentity = await wallet.get('admin');
        
        if (!charityAdminIdentity && !adminIdentity) {
            console.log('错误: 未找到CharityOrg管理员或默认管理员身份');
            console.log('请先运行enrollAdmin.js程序注册管理员身份');
            return;
        }
        
        // 确定使用哪个管理员身份
        let adminId = 'admin';
        if (charityAdminIdentity) {
            console.log('使用CharityOrg组织管理员身份...');
            adminId = 'admin-charityorg';
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
        const contract = network.getContract('mercy', 'org.mercy.charity.project');

        // 第六步: 验证输入数据
        console.log('正在验证项目数据...');
        // 验证日期格式
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(startDate) || !dateRegex.test(endDate)) {
            throw new Error('日期格式无效，请使用YYYY-MM-DD格式');
        }
        
        // 验证开始日期不晚于结束日期
        const startDateObj = new Date(startDate);
        const endDateObj = new Date(endDate);
        if (startDateObj > endDateObj) {
            throw new Error('开始日期不能晚于结束日期');
        }
        
        // 验证资金金额为正数
        const fundingAmount = parseFloat(totalFundingRequired);
        if (isNaN(fundingAmount) || fundingAmount <= 0) {
            throw new Error('所需资金必须为正数');
        }

        // 第七步: 检查项目所有者是否存在
        console.log('正在验证项目所有者...');
        try {
            const ownerContract = network.getContract('mercy', 'org.mercy.charity.projectowner');
            await ownerContract.evaluateTransaction('queryProjectOwner', projectOwnerId);
            console.log('项目所有者验证成功');
        } catch (error) {
            console.log(`错误: 项目所有者 ${projectOwnerId} 不存在`);
            console.log('请先运行 registerProjectOwner.js 注册项目所有者');
            return;
        }

        // 第八步: 检查项目ID是否已存在
        console.log('检查项目ID是否已存在...');
        try {
            await contract.evaluateTransaction('queryProject', projectId);
            console.log('错误: 该项目ID已存在');
            return;
        } catch (error) {
            // 项目不存在，继续创建流程
            console.log('项目ID可用，继续创建流程...');
        }

        // 第九步: 提交交易 - 创建项目
        console.log('正在创建项目...');
        const result = await contract.submitTransaction(
            'createProject',
            projectId,
            name,
            description,
            startDate,
            endDate,
            JSON.stringify(categories),
            totalFundingRequired,
            projectOwnerId
        );
        
        // 第十步: 解析并显示结果
        console.log('交易已提交，正在获取结果...');
        const project = JSON.parse(result.toString());

        // 打印项目信息
        console.log('\n✅ 项目创建成功！');
        console.log('====================================');
        console.log(`🆔 项目ID: ${project.projectId}`);
        console.log(`📝 名称: ${project.name}`);
        console.log(`ℹ️ 描述: ${project.description}`);
        console.log(`📅 起止日期: ${project.startDate} 至 ${project.endDate}`);
        console.log(`🏷️ 类别: ${project.categories.join(', ')}`);
        console.log(`💰 所需资金: ${project.totalFundingRequired}`);
        console.log(`👤 项目所有者: ${project.projectOwnerId}`);
        console.log(`🚦 状态: ${project.status}`);
        console.log(`🔍 合规状态: ${project.complianceStatus}`);
        console.log('====================================');
        
        console.log('\n📝 注意: 项目创建后需要等待审核批准才能接受捐赠');
        
        // 第十一步: 断开网关连接
        await gateway.disconnect();
        console.log('已断开与网关的连接');

    } catch (error) {
        console.error(`❌ 项目创建失败: ${error.message}`);
        if (error.stack) {
            console.error('详细错误信息:');
            console.error(error.stack);
        }
        process.exit(1);
    }
}

// 命令行参数处理
const args = process.argv.slice(2);
if (args.length !== 8) {
    console.log('用法: node createProject.js <projectId> <name> <description> <startDate> <endDate> <categories> <totalFundingRequired> <projectOwnerId>');
    console.log('示例: node createProject.js proj001 "儿童教育援助" "为贫困地区儿童提供教育资源" 2023-01-01 2023-12-31 教育,儿童 100000 owner001');
    process.exit(1);
}

// 解析参数
const [projectId, name, description, startDate, endDate, categoriesStr, totalFundingRequired, projectOwnerId] = args;
const categories = categoriesStr.split(',');

// 执行主函数
createProject(projectId, name, description, startDate, endDate, categories, totalFundingRequired, projectOwnerId)
    .then(() => {
        console.log('项目创建流程已完成');
    })
    .catch((e) => {
        console.log('项目创建过程中发生错误: ' + e);
    }); 