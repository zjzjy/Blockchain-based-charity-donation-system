/**
 * updateProjectStatus.js - 更新项目状态脚本
 * 
 * 功能描述: 通过连接Hyperledger Fabric区块链网络更新特定项目的状态，
 * 允许管理员更改项目的生命周期状态，如注册、开始、进行中、接近完成、完成、取消或审核中。
 * 
 * 使用方法: node updateProjectStatus.js <projectId> <status>
 * 参数说明: 
 *   - projectId: 项目标识符
 *   - status: 项目新状态，可选值: 
 *     REGISTERED, STARTED, IN_PROGRESS, NEAR_COMPLETION, COMPLETED, CANCELLED, UNDER_REVIEW
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
 * 负责整个项目状态更新流程的协调与执行
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
        // 注意：此脚本需要管理员权限，因为项目状态变更是敏感操作
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
        const network = await gateway.getNetwork('mercychannel'); // 连接到指定通道
        const projectContract = network.getContract('projectContract'); // 获取项目合约

        // 第六步: 处理命令行参数
        // 从命令行获取用户输入的参数
        const args = process.argv.slice(2);
        if (args.length !== 2) {
            console.log('用法: node updateProjectStatus.js <projectId> <status>');
            console.log('状态可选值: REGISTERED, STARTED, IN_PROGRESS, NEAR_COMPLETION, COMPLETED, CANCELLED, UNDER_REVIEW');
            return;
        }

        // 第七步: 解析命令行参数
        const [projectId, newStatus] = args; // 使用数组解构获取项目ID和新状态

        // 第八步: 验证项目存在性
        // 通过调用查询方法检查项目是否存在
        try {
            await projectContract.evaluateTransaction('queryProject', projectId);
        } catch (error) {
            console.log('错误：项目不存在');
            return;
        }

        // 第九步: 验证新状态的有效性
        // 检查提供的状态是否在允许的状态列表中
        const validStatuses = ['REGISTERED', 'STARTED', 'IN_PROGRESS', 'NEAR_COMPLETION', 'COMPLETED', 'CANCELLED', 'UNDER_REVIEW'];
        if (!validStatuses.includes(newStatus)) {
            console.log('错误：无效的项目状态');
            console.log('状态可选值: REGISTERED, STARTED, IN_PROGRESS, NEAR_COMPLETION, COMPLETED, CANCELLED, UNDER_REVIEW');
            return;
        }

        // 第十步: 调用智能合约更新项目状态
        // 使用submitTransaction方法修改账本状态
        console.log(`正在更新项目 ${projectId} 的状态为 ${newStatus}...`);
        await projectContract.submitTransaction('updateProjectStatus', projectId, newStatus);

        // 第十一步: 查询更新后的项目信息
        // 验证更新是否成功，并获取最新的项目数据
        const projectResult = await projectContract.evaluateTransaction('queryProject', projectId);
        const project = JSON.parse(projectResult.toString());

        // 第十二步: 输出更新结果
        // 格式化并显示更新后的项目信息
        console.log('\n项目状态更新成功！');
        console.log('------------------------');
        console.log(`项目ID: ${project.projectId}`);
        console.log(`名称: ${project.name}`);
        console.log(`描述: ${project.description}`);
        console.log(`项目状态: ${project.projectStatus}`);
        console.log(`更新时间: ${new Date().toISOString()}`);

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