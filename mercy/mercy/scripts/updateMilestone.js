/**
 * updateMilestone.js - 更新项目里程碑状态脚本
 * 
 * 功能描述: 通过连接Hyperledger Fabric区块链网络更新特定项目的里程碑信息，
 * 主要用于标记里程碑的完成状态和完成日期，以便跟踪项目进度。
 * 
 * 使用方法: node updateMilestone.js <projectId> <milestoneId> <isCompleted> [completionDate]
 * 参数说明: 
 *   - projectId: 项目标识符
 *   - milestoneId: 里程碑标识符
 *   - isCompleted: 完成状态(true/false)
 *   - completionDate: 可选参数，完成日期，格式为YYYY-MM-DD
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
 * 负责整个里程碑更新流程的协调与执行
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
        const projectContract = network.getContract('projectContract'); // 获取项目合约

        // 第六步: 处理命令行参数
        // 从命令行获取用户输入的参数
        const args = process.argv.slice(2);
        if (args.length !== 3 && args.length !== 4) {
            console.log('用法: node updateMilestone.js <projectId> <milestoneId> <isCompleted> [completionDate]');
            console.log('说明: isCompleted 为布尔值 (true/false), completionDate 为可选参数，格式为 YYYY-MM-DD');
            return;
        }

        // 第七步: 解析命令行参数
        const projectId = args[0];                      // 项目ID
        const milestoneId = args[1];                    // 里程碑ID
        const isCompleted = args[2].toLowerCase() === 'true'; // 解析布尔值
        // 如果提供了完成日期则使用，否则使用当前日期
        const completionDate = args.length === 4 ? args[3] : new Date().toISOString().split('T')[0];

        // 第八步: 验证项目存在性
        // 通过调用查询方法检查项目是否存在
        try {
            await projectContract.evaluateTransaction('queryProject', projectId);
        } catch (error) {
            console.log('错误：项目不存在');
            return;
        }

        // 第九步: 调用智能合约更新里程碑
        // 使用submitTransaction方法修改账本状态
        console.log(`正在更新项目 ${projectId} 的里程碑 ${milestoneId}...`);
        await projectContract.submitTransaction(
            'updateMilestone', 
            projectId, 
            milestoneId, 
            isCompleted.toString(),  // 将布尔值转换为字符串
            completionDate           // 完成日期
        );

        // 第十步: 查询更新后的项目信息
        // 验证更新是否成功，并获取最新的项目数据
        const projectResult = await projectContract.evaluateTransaction('queryProject', projectId);
        const project = JSON.parse(projectResult.toString());

        // 第十一步: 查找并获取更新后的里程碑数据
        // 从项目的里程碑数组中找到特定ID的里程碑
        const updatedMilestone = project.milestones.find(m => m.milestoneId === milestoneId);
        
        // 第十二步: 输出更新结果
        // 格式化并显示更新后的里程碑信息
        console.log('\n里程碑更新成功！');
        console.log('------------------------');
        console.log(`项目ID: ${project.projectId}`);
        console.log(`项目名称: ${project.name}`);
        console.log(`里程碑ID: ${updatedMilestone.milestoneId}`);
        console.log(`里程碑描述: ${updatedMilestone.description}`);
        console.log(`完成状态: ${updatedMilestone.isCompleted ? '已完成' : '未完成'}`);
        console.log(`完成日期: ${updatedMilestone.isCompleted ? updatedMilestone.completionDate : '尚未完成'}`);
        console.log(`截止日期: ${updatedMilestone.deadline}`);
        console.log(`所需资金: ${updatedMilestone.fundingAmount}`);

        // 第十三步: 关闭网关连接
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