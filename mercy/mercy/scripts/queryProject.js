/**
 * queryProject.js - 查询项目详细信息脚本
 * 
 * 功能描述: 通过连接Hyperledger Fabric区块链网络查询特定项目的信息，
 * 包括项目基本信息、里程碑列表及相关捐赠记录，提供项目状态的完整视图。
 * 
 * 使用方法: node queryProject.js <projectId>
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
 * 负责整个查询流程的协调与执行
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

        // 第三步: 检查用户身份是否存在
        // 如果用户身份不存在，则无法连接到网络，需要先进行注册
        const identity = await wallet.get('user1');
        if (!identity) {
            console.log('请先注册用户身份');
            return;
        }

        // 第四步: 初始化并连接到Fabric网关
        // 网关是连接到Fabric网络的入口点
        const gateway = new Gateway();
        await gateway.connect(ccp, { 
            wallet,                  // 指定钱包 
            identity: 'user1',       // 使用的身份名称
            discovery: { 
                enabled: true,       // 启用服务发现
                asLocalhost: true    // 将远程地址视为本地地址(适用于开发环境)
            } 
        });

        // 第五步: 获取区块链网络和智能合约实例
        // 通过网关连接到特定的通道和合约
        const network = await gateway.getNetwork('mercychannel');   // 连接到指定通道
        const projectContract = network.getContract('projectContract');  // 获取项目合约
        const donationContract = network.getContract('donationContract'); // 获取捐赠合约

        // 第六步: 处理命令行参数
        // 从命令行获取用户输入的项目ID
        const args = process.argv.slice(2); // 获取命令行参数(去除node和脚本名)
        if (args.length !== 1) {
            console.log('用法: node queryProject.js <projectId>');
            return;
        }

        const projectId = args[0]; // 获取项目ID

        // 第七步: 调用智能合约查询项目信息
        // 使用evaluateTransaction方法只读查询，不修改账本状态
        console.log('正在查询项目信息...');
        const projectResult = await projectContract.evaluateTransaction('queryProject', projectId);
        const project = JSON.parse(projectResult.toString()); // 解析JSON格式的项目数据

        // 第八步: 查询与项目相关的所有捐赠记录
        // 通过项目ID获取所有关联的捐赠交易
        const donationsResult = await donationContract.evaluateTransaction('queryProjectDonations', projectId);
        const donations = JSON.parse(donationsResult.toString()); // 解析JSON格式的捐赠数据

        // 第九步: 格式化并输出项目基本信息
        // 显示项目的核心属性和状态
        console.log('\n项目信息：');
        console.log('------------------------');
        console.log(`项目ID: ${project.projectId}`);
        console.log(`名称: ${project.name}`);
        console.log(`描述: ${project.description}`);
        console.log(`开始日期: ${project.startDate}`);
        console.log(`结束日期: ${project.endDate}`);
        console.log(`类别: ${project.categories.join(', ')}`);
        console.log(`所需资金: ${project.totalFundingRequired}`);
        console.log(`已分配资金: ${project.allocatedFunding}`);
        console.log(`资金状态: ${project.fundingStatus}`);
        console.log(`项目状态: ${project.projectStatus}`);
        console.log(`合规状态: ${project.complianceStatus}`);

        // 第十步: 输出项目的里程碑信息
        // 遍历并显示所有里程碑的详细情况
        console.log('\n里程碑信息：');
        console.log('------------------------');
        project.milestones.forEach(milestone => {
            console.log(`\n里程碑ID: ${milestone.milestoneId}`);
            console.log(`描述: ${milestone.description}`);
            console.log(`截止日期: ${milestone.deadline}`);
            console.log(`所需资金: ${milestone.fundingAmount}`);
            console.log(`完成状态: ${milestone.isCompleted ? '已完成' : '未完成'}`);
            if (milestone.completionDate) {
                console.log(`完成日期: ${milestone.completionDate}`);
            }
        });

        // 第十一步: 输出项目的捐赠记录
        // 遍历并显示所有捐赠的详细信息
        console.log('\n捐赠记录：');
        console.log('------------------------');
        donations.forEach(donation => {
            console.log(`\n交易ID: ${donation.transactionId}`);
            console.log(`捐赠者ID: ${donation.donorId}`);
            console.log(`金额: ${donation.amount}`);
            console.log(`时间: ${donation.timestamp}`);
            console.log(`状态: ${donation.status}`);
        });

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