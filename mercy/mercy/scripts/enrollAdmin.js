/**
 * 管理员身份注册脚本 (enrollAdmin.js)
 * -----------------------------------------
 * 
 * 功能概述:
 * 此脚本用于向Fabric CA注册管理员用户，并将其身份信息保存到本地钱包。
 * 管理员是系统中拥有最高权限的角色，负责注册项目所有者和执行系统级操作。
 * 
 * 此脚本通常是区块链网络部署后首先需要运行的脚本之一，为后续操作建立基础。
 * 
 * 主要职责:
 * 1. 连接到组织的证书颁发机构(CA)
 * 2. 注册并登记管理员身份
 * 3. 将身份凭证存储到本地钱包
 * 4. 为两个组织(DonorOrg和CharityOrg)分别创建管理员
 * 
 * 使用方法:
 * node enrollAdmin.js [orgType]  // orgType可选值: donor, charity, 默认: both
 */

'use strict';

// 导入必要的模块
const FabricCAServices = require('fabric-ca-client');
const { Wallets } = require('fabric-network');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../config/.env') });

/**
 * 注册捐赠者组织(DonorOrg)管理员
 */
async function enrollDonorAdmin() {
    try {
        // 加载网络配置
        console.log('正在加载DonorOrg的网络配置...');
        const ccpPath = path.resolve(__dirname, '../config/connection.json');
        const ccp = JSON.parse(fs.readFileSync(ccpPath, 'utf8'));

        // 创建CA客户端
        const caInfo = ccp.certificateAuthorities['ca.donororg.example.com'];
        const caTLSCACerts = caInfo.tlsCACerts.path;
        const ca = new FabricCAServices(caInfo.url, { trustedRoots: caTLSCACerts, verify: false }, caInfo.caName);

        // 创建钱包
        console.log('创建DonorOrg管理员钱包...');
        const walletPath = path.join(__dirname, '../wallet');
        const wallet = await Wallets.newFileSystemWallet(walletPath);

        // 检查管理员是否已存在
        const adminExists = await wallet.get('admin-donororg');
        if (adminExists) {
            console.log('DonorOrg管理员身份已存在于钱包中，跳过注册');
            return true;
        }

        // 登记管理员
        console.log('正在注册DonorOrg管理员...');
        const enrollment = await ca.enroll({
            enrollmentID: 'admin',
            enrollmentSecret: 'adminpw'
        });

        // 创建身份对象
        const donorOrgMSP = process.env.ORG_MSPID || 'DonorOrgMSP';
        const x509Identity = {
            credentials: {
                certificate: enrollment.certificate,
                privateKey: enrollment.key.toBytes(),
            },
            mspId: donorOrgMSP,
            type: 'X.509',
        };

        // 保存到钱包
        await wallet.put('admin-donororg', x509Identity);
        console.log('✅ DonorOrg管理员身份注册成功，并保存到钱包');
        return true;
    } catch (error) {
        console.error(`❌ DonorOrg管理员注册失败: ${error}`);
        if (error.stack) {
            console.error('详细错误信息:');
            console.error(error.stack);
        }
        return false;
    }
}

/**
 * 注册慈善机构组织(CharityOrg)管理员
 */
async function enrollCharityAdmin() {
    try {
        // 加载网络配置
        console.log('正在加载CharityOrg的网络配置...');
        const ccpPath = path.resolve(__dirname, '../config/connection.json');
        const ccp = JSON.parse(fs.readFileSync(ccpPath, 'utf8'));

        // 创建CA客户端
        const caInfo = ccp.certificateAuthorities['ca.charityorg.example.com'];
        const caTLSCACerts = caInfo.tlsCACerts.path;
        const ca = new FabricCAServices(caInfo.url, { trustedRoots: caTLSCACerts, verify: false }, caInfo.caName);

        // 创建钱包
        console.log('创建CharityOrg管理员钱包...');
        const walletPath = path.join(__dirname, '../wallet');
        const wallet = await Wallets.newFileSystemWallet(walletPath);

        // 检查管理员是否已存在
        const adminExists = await wallet.get('admin-charityorg');
        if (adminExists) {
            console.log('CharityOrg管理员身份已存在于钱包中，跳过注册');
            return true;
        }

        // 登记管理员
        console.log('正在注册CharityOrg管理员...');
        const enrollment = await ca.enroll({
            enrollmentID: 'admin',
            enrollmentSecret: 'adminpw'
        });

        // 创建身份对象
        const charityOrgMSP = process.env.CHARITY_ORG_MSPID || 'CharityOrgMSP';
        const x509Identity = {
            credentials: {
                certificate: enrollment.certificate,
                privateKey: enrollment.key.toBytes(),
            },
            mspId: charityOrgMSP,
            type: 'X.509',
        };

        // 保存到钱包
        await wallet.put('admin-charityorg', x509Identity);
        console.log('✅ CharityOrg管理员身份注册成功，并保存到钱包');
        return true;
    } catch (error) {
        console.error(`❌ CharityOrg管理员注册失败: ${error}`);
        if (error.stack) {
            console.error('详细错误信息:');
            console.error(error.stack);
        }
        return false;
    }
}

/**
 * 创建默认管理员身份别名
 * 此函数创建一个名为'admin'的身份，指向捐赠者组织的管理员
 */
async function createDefaultAdminAlias() {
    try {
        const walletPath = path.join(__dirname, '../wallet');
        const wallet = await Wallets.newFileSystemWallet(walletPath);
        
        // 检查默认管理员是否已存在
        const defaultAdminExists = await wallet.get('admin');
        if (defaultAdminExists) {
            console.log('默认admin身份已存在，跳过创建');
            return;
        }
        
        // 检查捐赠者组织管理员是否存在
        const donorAdminExists = await wallet.get('admin-donororg');
        if (!donorAdminExists) {
            console.log('错误: 无法创建默认管理员别名，DonorOrg管理员不存在');
            return;
        }
        
        // 复制捐赠者组织管理员为默认管理员
        await wallet.put('admin', donorAdminExists);
        console.log('✅ 已创建默认管理员别名(指向DonorOrg管理员)');
    } catch (error) {
        console.error(`❌ 创建默认管理员别名失败: ${error}`);
    }
}

/**
 * 主函数
 */
async function main() {
    try {
        console.log('====================================');
        console.log('   慈善区块链网络 - 管理员注册');
        console.log('====================================');
        
        // 获取命令行参数，确定要注册的组织类型
        const args = process.argv.slice(2);
        const orgType = args[0] ? args[0].toLowerCase() : 'both';
        
        let donorSuccess = false;
        let charitySuccess = false;
        
        if (orgType === 'donor' || orgType === 'both') {
            donorSuccess = await enrollDonorAdmin();
        }
        
        if (orgType === 'charity' || orgType === 'both') {
            charitySuccess = await enrollCharityAdmin();
        }
        
        // 创建默认管理员别名（只有当捐赠者管理员注册成功时）
        if (donorSuccess) {
            await createDefaultAdminAlias();
        }
        
        console.log('\n管理员注册摘要:');
        console.log('------------------------------------');
        console.log(`DonorOrg管理员: ${donorSuccess ? '✅ 成功' : '❌ 失败'}`);
        console.log(`CharityOrg管理员: ${charitySuccess ? '✅ 成功' : '❌ 失败'}`);
        console.log('------------------------------------');
        
        if (donorSuccess || charitySuccess) {
            console.log('\n管理员注册完成！现在可以运行其他脚本了，例如:');
            console.log('- node registerProjectOwner.js <...> (注册项目所有者)');
            console.log('- node registerDonor.js <...> (注册捐赠者)');
        } else {
            console.log('\n❌ 管理员注册失败！请检查错误信息并重试。');
            process.exit(1);
        }
        
    } catch (error) {
        console.error(`管理员注册过程中发生错误: ${error}`);
        process.exit(1);
    }
}

// 执行主函数
main(); 