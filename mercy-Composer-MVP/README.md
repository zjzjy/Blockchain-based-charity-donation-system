# 慈善捐赠系统 MVP 版本（基于Hyperledger Composer）

这是一个基于Hyperledger Composer的慈善捐赠管理系统的最小可行产品(MVP)版本，专注于项目所有者和捐赠者之间的直接互动。系统通过区块链技术确保捐赠资金的透明管理，并由捐赠者直接参与决策项目资金的释放。

## 系统特点

1. **角色简化**：仅保留项目所有者和捐赠者两个角色
2. **里程碑驱动**：项目资金按里程碑分阶段释放
3. **捐赠者决策**：由捐赠者审核里程碑完成情况并决定是否释放下一步善款
4. **透明追踪**：所有捐赠和资金释放行为在区块链上记录，不可篡改

## 项目结构

```
mercy-Composer-MVP/
├── models/              # 数据模型定义
│   └── charity.cto      # 业务网络定义文件
├── lib/                 # 交易处理函数
│   ├── donationTransaction.js   # 捐赠相关交易
│   └── projectTransaction.js    # 项目相关交易
├── permissions/         # 访问控制规则
│   └── permissions.acl  # 访问控制列表
└── package.json         # 项目配置文件
```

## 业务流程

1. **项目创建**：项目所有者创建慈善项目，定义多个带有资金需求的里程碑
2. **捐赠资金**：捐赠者向项目捐赠资金
3. **里程碑完成**：项目所有者完成里程碑并提交证据
4. **资金释放**：捐赠者审核里程碑完成情况，决定是否释放资金
5. **项目完成**：所有里程碑完成并获得资金释放后，项目标记为完成

## 安装与部署

### 前提条件

1. 安装 Hyperledger Composer 开发环境
   ```bash
   npm install -g composer-cli@0.20
   npm install -g composer-rest-server@0.20
   npm install -g generator-hyperledger-composer@0.20
   npm install -g composer-playground@0.20
   ```

2. 启动 Fabric 网络
   ```bash
   cd ~/fabric-dev-servers
   export FABRIC_VERSION=hlfv12
   ./startFabric.sh
   ./createPeerAdminCard.sh
   ```

### 部署业务网络

1. 克隆项目
   ```bash
   git clone git https://github.com/zjzjy/Blockchain-based-charity-donation-system.git
   cd mercy-Composer-MVP
   ```

2. 安装依赖
   ```bash
   npm install
   ```

3. 创建和部署业务网络
   ```bash
   mkdir -p dist
   composer archive create --sourceType dir --sourceName . -a ./dist/mercy-charity-mvp.bna
   composer network install --card PeerAdmin@hlfv1 --archiveFile dist/mercy-charity-mvp.bna
   composer network start --networkName mercy-charity-mvp --networkVersion 0.0.1 --networkAdmin admin --networkAdminEnrollSecret adminpw --card PeerAdmin@hlfv1 --file networkadmin.card
   composer card import --file networkadmin.card
   ```

### 启动 Composer Playground

```bash
composer-playground
```

通过浏览器访问 http://localhost:8080 进入 Composer Playground。

## 使用演示

### 1. 创建参与者身份

系统提供了SetupDemo交易来创建默认参与者：

```json
{
  "$class": "org.mercy.charity.SetupDemo"
}
```

提交此交易后，系统将创建以下默认参与者：
- 项目所有者：张项目 (OWNER1)
- 捐赠者：李捐赠 (DONOR1)

然后为这两个参与者创建身份卡片：

```bash
composer identity issue -c admin@mercy-charity-mvp -u projectowner1 -a "resource:org.mercy.charity.ProjectOwner#OWNER1"
composer identity issue -c admin@mercy-charity-mvp -u donor1 -a "resource:org.mercy.charity.Donor#DONOR1"
```

### 2. 项目所有者创建项目

以项目所有者身份登录 Composer Playground，创建一个包含多个里程碑的项目：

```json
{
  "$class": "org.mercy.charity.Project",
  "projectId": "PROJECT1",
  "name": "希望小学建设",
  "description": "为山区孩子建设新教室",
  "startDate": "2023-04-02T10:00:00.000Z",
  "endDate": "2023-12-31T10:00:00.000Z",
  "categories": ["education", "children"],
  "totalFundingRequired": 100000,
  "allocatedFunding": 0,
  "fundingStatus": "PENDING",
  "projectStatus": "REGISTERED",
  "milestones": [
    {
      "milestoneId": "MS1",
      "description": "完成设计规划",
      "deadline": "2023-05-30T10:00:00.000Z",
      "fundingAmount": 10000,
      "isCompleted": false,
      "fundingReleased": false
    },
    {
      "milestoneId": "MS2",
      "description": "完成地基建设",
      "deadline": "2023-07-30T10:00:00.000Z",
      "fundingAmount": 30000,
      "isCompleted": false,
      "fundingReleased": false
    },
    {
      "milestoneId": "MS3",
      "description": "完成主体建设",
      "deadline": "2023-10-30T10:00:00.000Z",
      "fundingAmount": 50000,
      "isCompleted": false,
      "fundingReleased": false
    },
    {
      "milestoneId": "MS4",
      "description": "完成内部装修",
      "deadline": "2023-12-15T10:00:00.000Z",
      "fundingAmount": 10000,
      "isCompleted": false,
      "fundingReleased": false
    }
  ],
  "teamMembers": [
    {
      "memberId": "TM1",
      "name": "李工程",
      "role": "项目经理",
      "contactInfo": "manager@example.com"
    }
  ],
  "owner": "resource:org.mercy.charity.ProjectOwner#OWNER1"
}
```

### 3. 捐赠者捐赠资金

以捐赠者身份登录，提交捐赠交易：

```json
{
  "$class": "org.mercy.charity.MakeDonation",
  "donor": "resource:org.mercy.charity.Donor#DONOR1",
  "project": "resource:org.mercy.charity.Project#PROJECT1",
  "amount": 100000
}
```

### 4. 项目所有者完成里程碑

以项目所有者身份登录，更新里程碑状态并提供证据：

```json
{
  "$class": "org.mercy.charity.UpdateMilestone",
  "project": "resource:org.mercy.charity.Project#PROJECT1",
  "milestoneId": "MS1",
  "isCompleted": true,
  "evidenceHash": "QmZ9mxUCZYP5KCxaFLRZf4EgC8sCmVuCzJf1YwfgcNDxQ1"
}
```

### 5. 捐赠者审核并释放资金

以捐赠者身份登录，审核里程碑并决定是否释放资金：

```json
{
  "$class": "org.mercy.charity.ApproveMilestoneFunding",
  "donor": "resource:org.mercy.charity.Donor#DONOR1",
  "project": "resource:org.mercy.charity.Project#PROJECT1",
  "milestoneId": "MS1",
  "approved": true
}
```

### 6. 继续后续里程碑

重复步骤 4-5 完成后续里程碑，直到项目完成。

## 关键特性说明

1. **里程碑资金释放**：每个里程碑完成后，需要捐赠者审核并批准才能释放资金
2. **证据提交**：项目所有者需要提交证据哈希，证明里程碑已完成
3. **自动状态更新**：所有里程碑完成并获得资金释放后，项目自动更新为完成状态

## 许可证

本项目采用 ISC 许可证。 