# Mercy 慈善捐赠系统

基于Hyperledger Fabric的区块链慈善捐赠系统，提供透明、安全和高效的捐赠管理解决方案。

## 功能特点

- 捐赠者管理
  - 捐赠者注册
  - KYC验证
  - 捐赠历史追踪
  - 偏好类别设置

- 项目管理
  - 项目创建
  - 里程碑管理
  - 资金分配
  - 进度追踪

- 捐赠管理
  - 安全捐赠
  - 交易记录
  - 资金追踪
  - 状态更新

## 系统要求

- Node.js >= 12.0.0
- Hyperledger Fabric >= 2.0.0
- Docker & Docker Compose

## 安装步骤

1. 克隆项目
```bash
git clone <repository-url>
cd mercy
```

2. 安装依赖
```bash
npm install
```

3. 配置网络
- 确保Hyperledger Fabric网络已启动
- 配置connection.json文件

4. 部署智能合约
```bash
./network.sh deploy
```

## 使用方法

### 注册捐赠者
```bash
node scripts/registerDonor.js <donorId> <name> <email> <phone> <walletAddress>
```

### 创建项目
```bash
node scripts/createProject.js <projectId> <name> <description> <startDate> <endDate> <categories> <totalFundingRequired>
```

### 进行捐赠
```bash
node scripts/givemoney.js <donorId> <projectId> <amount>
```

### 查询项目
```bash
node scripts/queryProject.js <projectId>
```

## 安全特性

- KYC验证
- 基于角色的访问控制
- 交易签名验证
- 资金锁定机制
- 审计追踪

## 贡献指南

1. Fork 项目
2. 创建特性分支
3. 提交更改
4. 推送到分支
5. 创建 Pull Request

## 许可证

ISC License 