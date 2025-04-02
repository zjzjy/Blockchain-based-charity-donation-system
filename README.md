# 区块链慈善捐赠跟踪与自动拨款系统

本项目是一个基于区块链技术的慈善捐赠管理系统，旨在提供透明、可追踪的捐赠流程，并实现捐赠资金的自动化拨款。通过区块链的不可篡改性和智能合约的自动执行能力，该系统确保了慈善捐赠的全过程公开透明，增强了捐赠者与慈善项目之间的信任。

## 项目版本

本仓库包含三个版本的慈善捐赠系统实现：

1. **mercy** - 基于Hyperledger Fabric的完整版本
2. **mercy-Composer** - 基于Hyperledger Composer的完整版本
3. **mercy-Composer-MVP** - 基于Hyperledger Composer的最小可行产品(MVP)版本

## 系统功能

### 主要特点

- **透明度** - 所有捐赠交易在区块链上记录，不可篡改
- **里程碑管理** - 项目资金按里程碑分阶段释放
- **捐赠者决策** - 捐赠者可直接参与资金释放决策
- **自动拨款** - 智能合约自动执行资金拨款
- **全程可追溯** - 从捐赠到拨款的全过程可追溯

### 角色与职责

- **捐赠者** - 向项目提供资金，审核项目进度，决定资金释放
- **项目所有者** - 创建和管理慈善项目，提交里程碑证据
- **管理员** (完整版) - 系统管理和用户审核
- **审计员** (完整版) - 负责系统合规检查和审计

## 技术栈

- **区块链平台**：Hyperledger Fabric / Hyperledger Composer
- **智能合约**：Chaincode (Go) / Composer业务网络定义
- **前端**：HTML/CSS/JavaScript
- **API**：RESTful API
- **存储**：区块链分布式账本 + 传统数据库

## 系统架构

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│  捐赠者应用  │    │ 项目方应用  │    │  管理员应用  │
└──────┬──────┘    └──────┬──────┘    └──────┬──────┘
       │                  │                   │
       └─────────┬────────┴─────────┬────────┘
                 │                  │
        ┌────────┴────────┐ ┌───────┴────────┐
        │    API 服务器   │ │   事件监听器    │
        └────────┬────────┘ └───────┬────────┘
                 │                  │
        ┌────────┴──────────────────┴────────┐
        │          区块链网络节点            │
        └─────────────────────────────────────┘
```

## 业务流程

1. **项目创建** - 项目所有者创建慈善项目，定义资金需求和里程碑
2. **捐赠资金** - 捐赠者向项目捐赠资金
3. **项目进展** - 项目所有者完成里程碑并提交证据
4. **资金释放** - 捐赠者或系统审核里程碑完成情况，智能合约自动释放资金
5. **项目完成** - 所有里程碑完成后，项目状态更新为已完成

## 安装指南

每个版本的系统都有各自的安装说明，请参考相应目录下的README.md文件：

- [mercy 安装指南](./mercy/mercy/README.md)
- [mercy-Composer 安装指南](./mercy-Composer/README.md)
- [mercy-Composer-MVP 安装指南](./mercy-Composer-MVP/README.md)

## 使用演示

### MVP版本快速演示

1. 部署业务网络并创建参与者
```bash
# 安装依赖和部署
cd mercy-Composer-MVP
npm install
# 创建业务网络
composer archive create --sourceType dir --sourceName . -a ./dist/mercy-charity-mvp.bna
# 安装业务网络
composer network install --card PeerAdmin@hlfv1 --archiveFile dist/mercy-charity-mvp.bna
# 启动网络
composer network start --networkName mercy-charity-mvp --networkVersion 0.0.1 --networkAdmin admin --networkAdminEnrollSecret adminpw --card PeerAdmin@hlfv1 --file networkadmin.card
# 导入卡片
composer card import --file networkadmin.card
# 创建默认参与者
composer transaction submit --card admin@mercy-charity-mvp -d '{"$class":"org.mercy.charity.SetupDemo"}'
```

2. 创建项目
```bash
# 以项目所有者身份创建项目
composer transaction submit --card projectowner1@mercy-charity-mvp -d '{
  "$class": "org.mercy.charity.CreateProject",
  "projectId": "PROJECT1",
  "name": "希望小学建设",
  "description": "为山区孩子建设新教室",
  "startDate": "2023-04-02T10:00:00.000Z",
  "endDate": "2023-12-31T10:00:00.000Z",
  "categories": ["education", "children"],
  "totalFundingRequired": 100000
}'
```

3. 捐赠资金
```bash
# 以捐赠者身份捐赠资金
composer transaction submit --card donor1@mercy-charity-mvp -d '{
  "$class": "org.mercy.charity.MakeDonation",
  "donor": "resource:org.mercy.charity.Donor#DONOR1",
  "project": "resource:org.mercy.charity.Project#PROJECT1",
  "amount": 100000
}'
```

## 许可证

ISC License 