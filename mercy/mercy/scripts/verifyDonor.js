/**
 * verifyDonor.js - 捐赠者身份验证脚本
 * 
 * 功能描述: 通过连接Hyperledger Fabric区块链网络对捐赠者进行KYC(了解您的客户)身份验证，
 * 验证成功后捐赠者将获得进行捐赠操作的权限。此脚本仅管理员可执行。
 * 
 * 使用方法: node verifyDonor.js <donorId>
 * 参数说明: 
 *   - donorId: 捐赠者标识符
 * 
 * 注意: 此脚本需要管理员身份权限才能执行
 * 
 * 作者: Junyin
 * 版本: 1.0
 */

'use strict';

// 引入必要的库
const { Gateway, Wallets } = require('fabric-network'); // Hyperledger Fabric SDK核心组件
const path = require('path');                          // 路径处理库
const fs = require('fs');                              // 文件系统操作库

/**
 * 主函数 - 程序入口点
 * 负责整个捐赠者验证流程的协调与执行
 */
async function main() {
    try {
        // 第一步: 读取连接配置文件并解析
        // 连接配置文件包含了网络端点、证书路径等关键网络信息
        const ccpPath = path.resolve(__dirname, '..', 'config', 'connection.json');
        const ccp = JSON.parse(fs.readFileSync(ccpPath, 'utf8'));

        // 第二步: 创建文件系统钱包实例
        // 钱包用于存储身份凭证，以便用户可以连接到区块链网络
        const walletPath = path.join(process.cwd(), 'wallet');
        const wallet = await Wallets.newFileSystemWallet(walletPath);

        // 第三步: 检查管理员身份是否存在
        // 注意：此脚本需要管理员权限，因为KYC验证是敏感操作
        const identity = await wallet.get('admin');
        if (!identity) {
            console.log('请先注册管理员身份');
            return;
        }

        // 第四步: 初始化并连接到Fabric网关
        // 使用管理员身份连接到网络
        const gateway = new Gateway();
        await gateway.connect(ccp, { 
            wallet,                  // 指定钱包 
            identity: 'admin',       // 使用管理员身份
            discovery: { 
                enabled: true,       // 启用服务发现
                asLocalhost: true    // 将远程地址视为本地地址(适用于开发环境)
            } 
        });

        // 第五步: 获取区块链网络和智能合约实例
        // 通过网关连接到特定的通道和合约
        const network = await gateway.getNetwork('mercychannel');  // 连接到指定通道
        const donorContract = network.getContract('donorContract'); // 获取捐赠者合约

        // 第六步: 处理命令行参数
        // 从命令行获取用户输入的捐赠者ID
        const args = process.argv.slice(2);
        if (args.length !== 1) {
            console.log('用法: node verifyDonor.js <donorId>');
            return;
        }

        // 第七步: 解析命令行参数
        const [donorId] = args; // 使用数组解构获取捐赠者ID

        // 第八步: 验证捐赠者存在性
        // 通过调用查询方法检查捐赠者是否存在
        try {
            await donorContract.evaluateTransaction('queryDonor', donorId);
        } catch (error) {
            console.log('错误：捐赠者不存在');
            return;
        }

        // 第九步: 调用智能合约执行KYC验证
        // 使用submitTransaction方法修改账本状态，将捐赠者标记为已验证
        console.log('正在验证捐赠者...');
        await donorContract.submitTransaction('verifyDonor', donorId);

        // 第十步: 查询验证后的捐赠者信息
        // 验证更新是否成功，并获取最新的捐赠者数据
        const donorResult = await donorContract.evaluateTransaction('queryDonor', donorId);
        const donor = JSON.parse(donorResult.toString());

        // 第十一步: 输出验证结果
        // 格式化并显示更新后的捐赠者信息
        console.log('\n捐赠者验证成功！');
        console.log('------------------------');
        console.log(`捐赠者ID: ${donor.donorId}`);
        console.log(`姓名: ${donor.name}`);
        console.log(`邮箱: ${donor.email}`);
        console.log(`电话: ${donor.phone}`);
        console.log(`KYC验证状态: ${donor.kycVerified ? '已验证' : '未验证'}`);
        console.log(`状态: ${donor.status}`);

        // 第十二步: 关闭网关连接
        // 断开与Fabric网络的连接，释放资源
        gateway.disconnect();

    } catch (error) {
        // 错误处理: 打印错误信息并以非零状态码退出
        console.error(`错误：${error.message}`);
        process.exit(1); // 退出程序，返回错误码1
    }
}

// 执行主函数
main(); 