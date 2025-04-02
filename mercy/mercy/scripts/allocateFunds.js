/**
 * 资金分配脚本 (allocateFunds.js)
 * --------------------------------------
 * 本脚本用于将已筹集的资金分配到项目的特定里程碑中
 * 只有管理员有权限执行此操作
 * 这是项目资金管理的关键环节，确保资金使用透明且有追踪
 */

'use strict';  // 启用严格模式，提高代码质量和安全性

// 引入必要的依赖包
const { Gateway, Wallets } = require('fabric-network');  // Hyperledger Fabric SDK
const path = require('path');  // 处理文件路径
const fs = require('fs');  // 文件系统操作

/**
 * 主函数 - 资金分配流程的入口点
 * 整个资金分配流程包括：连接网络、验证项目、分配资金、查询结果
 */
async function main() {
    try {
        // 步骤1: 读取连接配置文件
        // 从配置文件加载区块链网络连接信息
        const ccpPath = path.resolve(__dirname, '..', 'config', 'connection.json');
        const ccp = JSON.parse(fs.readFileSync(ccpPath, 'utf8'));

        // 步骤2: 创建并加载身份钱包
        // 钱包用于存储用户身份证书，用于区块链交互的身份认证
        const walletPath = path.join(process.cwd(), 'wallet');
        const wallet = await Wallets.newFileSystemWallet(walletPath);

        // 步骤3: 验证管理员身份是否存在
        // 检查管理员身份是否已注册到钱包中，只有管理员可以分配资金
        const identity = await wallet.get('admin');
        if (!identity) {
            console.log('请先注册管理员身份');
            return;  // 如果身份不存在，终止程序
        }

        // 步骤4: 连接到Fabric网关
        // 网关是连接到Fabric网络的入口点
        const gateway = new Gateway();
        await gateway.connect(ccp, { 
            wallet,  // 指定身份钱包 
            identity: 'admin',  // 使用管理员身份
            discovery: { enabled: true, asLocalhost: true }  // 启用服务发现
        });

        // 步骤5: 获取目标通道和智能合约
        // 获取指定通道上的智能合约实例，用于后续交易
        const network = await gateway.getNetwork('mercychannel');
        const projectContract = network.getContract('projectContract');

        // 步骤6: 解析命令行参数
        // 从命令行获取项目ID、里程碑ID和分配金额
        const args = process.argv.slice(2);
        if (args.length !== 3) {
            console.log('用法: node allocateFunds.js <projectId> <milestoneId> <amount>');
            return;  // 参数不正确时，显示用法说明并终止程序
        }

        const [projectId, milestoneId, amount] = args;

        // 步骤7: 验证项目是否存在
        // 在执行资金分配前，先确认项目存在于区块链上
        try {
            await projectContract.evaluateTransaction('queryProject', projectId);
        } catch (error) {
            console.log('错误：项目不存在');
            return;  // 如果项目不存在，终止程序
        }

        // 步骤8: 提交资金分配交易
        // 调用智能合约将资金分配到特定里程碑
        console.log(`正在为项目 ${projectId} 的里程碑 ${milestoneId} 分配资金 ${amount}...`);
        await projectContract.submitTransaction('allocateFundsToMilestone', projectId, milestoneId, amount);

        // 步骤9: 查询更新后的项目信息
        // 获取资金分配后的项目最新状态
        const projectResult = await projectContract.evaluateTransaction('queryProject', projectId);
        const project = JSON.parse(projectResult.toString());

        // 步骤10: 查找并获取更新后的里程碑信息
        // 从项目中找到特定里程碑的最新状态
        const updatedMilestone = project.milestones.find(m => m.milestoneId === milestoneId);
        
        // 步骤11: 打印操作结果 - 项目信息
        // 显示资金分配成功和更新后的项目详情
        console.log('\n资金分配成功！');
        console.log('------------------------');
        console.log(`项目ID: ${project.projectId}`);
        console.log(`项目名称: ${project.name}`);
        console.log(`项目状态: ${project.projectStatus}`);
        console.log(`总资金需求: ${project.totalFundingRequired}`);
        console.log(`已分配资金: ${project.allocatedFunding}`);
        console.log(`资金状态: ${project.fundingStatus}`);
        console.log('------------------------');
        
        // 步骤12: 打印操作结果 - 里程碑信息
        // 显示更新后的里程碑详情
        console.log(`里程碑ID: ${updatedMilestone.milestoneId}`);
        console.log(`资金需求: ${updatedMilestone.fundingAmount}`);
        console.log(`完成状态: ${updatedMilestone.isCompleted ? '已完成' : '未完成'}`);

        // 步骤13: 断开网关连接
        // 操作完成后关闭连接，释放资源
        gateway.disconnect();

    } catch (error) {
        // 异常处理
        // 捕获并显示执行过程中的任何错误
        console.error(`错误：${error.message}`);
        process.exit(1);  // 发生错误时以非零状态码退出
    }
}

// 脚本执行入口
// 调用主函数开始执行资金分配流程
main(); 