/**
 * 捐赠者注册脚本 (registerDonor.js)
 * --------------------------------------------
 * 
 * 功能概述:
 * 此脚本用于在区块链网络上注册新的捐赠者，是捐赠者参与慈善捐赠系统的第一步。
 * 注册的捐赠者信息将存储在区块链上，为后续的捐赠交易和KYC验证做准备。
 * 
 * 主要职责:
 * 1. 验证并注册新的捐赠者身份
 * 2. 检查捐赠者ID的唯一性
 * 3. 将捐赠者信息记录到区块链账本
 * 4. 提供友好的命令行交互和结果反馈
 * 
 * 使用方法:
 * node registerDonor.js <donorId> <name> <email> <phone> <walletAddress>
 * 
 * 参数说明:
 * - donorId: 捐赠者唯一标识符
 * - name: 捐赠者姓名
 * - email: 电子邮箱
 * - phone: 联系电话
 * - walletAddress: 数字钱包地址（用于接收/发送数字货币）
 */

'use strict';

// 导入必要的模块
const { Gateway, Wallets } = require('fabric-network'); // Hyperledger Fabric网络交互模块
const path = require('path');                          // 路径处理模块
const fs = require('fs');                             // 文件系统模块
require('dotenv').config({ path: path.resolve(__dirname, '../config/.env') }); // 加载环境变量

/**
 * 捐赠者注册主函数
 * @param {String} donorId - 捐赠者ID
 * @param {String} name - 捐赠者姓名
 * @param {String} email - 电子邮箱
 * @param {String} phone - 联系电话
 * @param {String} walletAddress - 数字钱包地址
 */
async function registerDonor(donorId, name, email, phone, walletAddress) {
    try {
        // 第一步: 加载网络配置
        console.log('正在加载网络配置...');
        // 使用正确的配置路径
        const ccpPath = path.resolve(__dirname, '../config/connection.json');
        const ccp = JSON.parse(fs.readFileSync(ccpPath, 'utf8'));

        // 第二步: 创建或加载钱包
        console.log('正在加载身份钱包...');
        const walletPath = path.join(__dirname, '../wallet');
        const wallet = await Wallets.newFileSystemWallet(walletPath);
        console.log(`钱包路径: ${walletPath}`);

        // 第三步: 检查管理员身份或DonorOrg的管理员身份是否存在
        // 优先检查DonorOrg特定管理员，因为捐赠者相关操作应该由DonorOrg背书
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
        const contract = network.getContract('mercy', 'org.mercy.charity.donor');

        // 第六步: 验证输入数据
        console.log('正在验证捐赠者数据...');
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

        // 验证钱包地址格式（示例为以太坊地址格式）
        const walletAddressRegex = /^0x[a-fA-F0-9]{40}$|^[a-zA-Z0-9]{26,35}$/;
        if (!walletAddressRegex.test(walletAddress)) {
            console.log('警告: 钱包地址格式可能不正确，但仍将继续注册');
        }

        // 第七步: 检查捐赠者是否已存在
        console.log('检查捐赠者ID是否已存在...');
        try {
            await contract.evaluateTransaction('queryDonor', donorId);
            console.log('错误: 该捐赠者ID已存在');
            return;
        } catch (error) {
            // 捐赠者不存在，继续注册流程
            console.log('捐赠者ID可用，继续注册流程...');
        }

        // 第八步: 提交交易 - 注册捐赠者
        console.log('正在注册捐赠者...');
        const result = await contract.submitTransaction(
            'registerDonor',
            donorId,
            name,
            email,
            phone,
            walletAddress
        );
        
        // 第九步: 解析并显示结果
        console.log('交易已提交，正在获取结果...');
        const donor = JSON.parse(result.toString());

        // 打印捐赠者信息
        console.log('\n✅ 捐赠者注册成功！');
        console.log('====================================');
        console.log(`🆔 捐赠者ID: ${donor.donorId}`);
        console.log(`👤 姓名: ${donor.name}`);
        console.log(`📧 邮箱: ${donor.email}`);
        console.log(`📱 电话: ${donor.phone}`);
        console.log(`💰 钱包地址: ${donor.walletAddress || '未设置'}`);
        console.log(`🔍 KYC验证状态: ${donor.kycVerified ? '已验证' : '未验证'}`);
        console.log(`🗓️ 注册日期: ${donor.registrationDate}`);
        console.log(`🚦 状态: ${donor.status}`);
        console.log('====================================');
        
        console.log('\n📝 注意: 该捐赠者当前未通过KYC验证，需要管理员验证后才能进行捐赠操作');
        console.log('    请运行 node verifyDonor.js ' + donorId + ' 完成验证');
        
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
    console.log('用法: node registerDonor.js <donorId> <name> <email> <phone> <walletAddress>');
    console.log('示例: node registerDonor.js donor001 "张三" zhang@example.com 13900001111 0xabcd1234wallet');
    process.exit(1);
}

// 解析参数
const [donorId, name, email, phone, walletAddress] = args;

// 执行主函数
registerDonor(donorId, name, email, phone, walletAddress)
    .then(() => {
        console.log('捐赠者注册流程已完成');
    })
    .catch((e) => {
        console.log('捐赠者注册过程中发生错误: ' + e);
    }); 