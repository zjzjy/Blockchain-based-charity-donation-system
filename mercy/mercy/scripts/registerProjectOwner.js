/**
 * 项目所有者注册脚本 (registerProjectOwner.js)
 * --------------------------------------------
 * 
 * 功能概述:
 * 此脚本用于向区块链网络注册新的项目所有者(慈善机构)，是慈善平台中项目发起前的必要步骤。
 * 项目所有者是发起和管理慈善项目的实体，可以是个人或组织。
 * 
 * 主要职责:
 * 1. 创建新的项目所有者身份并存储到区块链
 * 2. 验证项目所有者信息的完整性
 * 3. 检查项目所有者ID是否已存在(避免重复注册)
 * 4. 提供友好的命令行交互和结果反馈
 * 
 * 使用方法:
 * node registerProjectOwner.js <projectOwnerId> <name> <email> <phone> <address>
 * 
 * 参数说明:
 * - projectOwnerId: 项目所有者唯一标识符
 * - name: 项目所有者名称
 * - email: 电子邮箱
 * - phone: 联系电话
 * - address: 物理地址
 */

'use strict';

// 导入必要的模块
const { Gateway, Wallets } = require('fabric-network'); // Hyperledger Fabric网络交互模块
const path = require('path');                          // 路径处理模块
const fs = require('fs');                             // 文件系统模块
require('dotenv').config({ path: path.resolve(__dirname, '../config/.env') }); // 加载环境变量

/**
 * 项目所有者注册主函数
 * @param {String} projectOwnerId - 项目所有者ID
 * @param {String} name - 项目所有者名称
 * @param {String} email - 电子邮箱
 * @param {String} phone - 联系电话
 * @param {String} address - 物理地址
 */
async function registerProjectOwner(projectOwnerId, name, email, phone, address) {
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

        // 第三步: 检查管理员身份是否存在
        const adminIdentity = await wallet.get('admin');
        const donorAdminIdentity = await wallet.get('admin-donororg');
        const charityAdminIdentity = await wallet.get('admin-charityorg');
        
        if (!adminIdentity && !donorAdminIdentity && !charityAdminIdentity) {
            console.log('错误: 未找到任何管理员身份');
            console.log('请先运行enrollAdmin.js程序注册管理员身份');
            return;
        }
        
        // 确定使用哪个管理员身份
        let adminId = 'admin';
        if (!adminIdentity) {
            if (donorAdminIdentity) {
                console.log('使用DonorOrg管理员身份...');
                adminId = 'admin-donororg';
            } else {
                console.log('使用CharityOrg管理员身份...');
                adminId = 'admin-charityorg';
            }
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
        console.log('正在验证项目所有者数据...');
        // 验证电子邮箱格式
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            throw new Error('电子邮箱格式无效');
        }

        // 验证手机号格式 (简单示例，实际应根据国家/地区标准调整)
        const phoneRegex = /^\d{5,15}$/;
        if (!phoneRegex.test(phone.replace(/[\s-]/g, ''))) {
            throw new Error('手机号格式无效');
        }

        // 第七步: 检查项目所有者是否已存在
        console.log('检查项目所有者ID是否已存在...');
        try {
            await contract.evaluateTransaction('getProjectOwner', projectOwnerId);
            console.log('错误: 该项目所有者ID已存在');
            return;
        } catch (error) {
            // 项目所有者不存在，继续注册流程
            console.log('项目所有者ID可用，继续注册流程...');
        }

        // 第八步: 提交交易 - 注册项目所有者
        console.log('正在注册项目所有者...');
        const result = await contract.submitTransaction(
            'registerProjectOwner',
            projectOwnerId,
            name,
            email,
            phone,
            address
        );
        
        // 第九步: 解析并显示结果
        console.log('交易已提交，正在获取结果...');
        const owner = JSON.parse(result.toString());

        // 打印项目所有者信息
        console.log('\n✅ 项目所有者注册成功！');
        console.log('====================================');
        console.log(`🆔 项目所有者ID: ${owner.projectOwnerId}`);
        console.log(`👤 名称: ${owner.name}`);
        console.log(`📧 邮箱: ${owner.email}`);
        console.log(`📱 电话: ${owner.phone}`);
        console.log(`🏢 地址: ${address}`);
        console.log(`🔍 验证状态: ${owner.isVerified ? '已验证' : '未验证'}`);
        console.log(`📋 项目列表: ${owner.projectIds && owner.projectIds.length > 0 ? owner.projectIds.join(', ') : '暂无项目'}`);
        console.log('====================================');
        
        // 第十步: 断开网关连接
        await gateway.disconnect();
        console.log('已断开与网关的连接');

    } catch (error) {
        console.error(`❌ 注册失败: ${error.message}`);
        if (error.stack) {
            console.error('详细错误信息:');
            console.error(error.stack);
        }
        process.exit(1);
    }
}

// 命令行参数处理
const args = process.argv.slice(2);
if (args.length !== 5) {
    console.log('用法: node registerProjectOwner.js <projectOwnerId> <name> <email> <phone> <address>');
    console.log('示例: node registerProjectOwner.js charity001 "红十字会" redcross@example.com 13800138000 "北京市东城区东单北大街1号"');
    process.exit(1);
}

// 解析参数
const [projectOwnerId, name, email, phone, address] = args;

// 执行主函数
registerProjectOwner(projectOwnerId, name, email, phone, address)
    .then(() => {
        console.log('项目所有者注册流程已完成');
    })
    .catch((e) => {
        console.log('项目所有者注册过程中发生错误: ' + e);
    }); 