# 慈善捐赠系统 MVP 版本工作流程

本文档详细描述了慈善捐赠系统 MVP 版本的完整工作流程，包括初始化、参与者交互、操作顺序和关键功能。

## MVP版本设计理念

本系统是对原有慈善捐赠系统的简化版本，主要变化包括：

1. **角色简化**：移除了管理员和审计员角色，只保留了项目所有者和捐赠者
2. **静态参与者**：系统初始化时已包含默认的项目所有者和捐赠者
3. **资金决策权转移**：由捐赠者决定是否释放资金，而非管理机构
4. **里程碑证据**：项目所有者需要提供里程碑完成的证据

## 业务流程图

```
项目所有者 → 创建项目(含多个里程碑) → 项目
              ↓
捐赠者 → 捐赠资金 → 更新项目资金状态
              ↓
项目所有者 → 完成里程碑并提交证据 → 更新里程碑状态
              ↓
捐赠者 → 审核里程碑并决定是否释放资金 → 资金释放
              ↓
              重复直到所有里程碑完成
              ↓
系统 → 自动更新项目为已完成
```

## 系统初始化

系统提供了一个 SetupDemo 交易来创建默认参与者：
- 项目所有者：红十字会 (OWNER1)
- 捐赠者：李捐赠 (DONOR1)

需要先运行此交易，然后为参与者创建身份卡片。

## 详细操作流程

### 1. 准备开发环境

首先确保已安装 Hyperledger Composer 开发环境：

```bash
# 安装开发工具
npm install -g composer-cli@0.20
npm install -g composer-rest-server@0.20
npm install -g generator-hyperledger-composer@0.20
npm install -g composer-playground@0.20
npm install -g yo

# 启动 Fabric 开发环境
cd ~/fabric-dev-servers
export FABRIC_VERSION=hlfv12
./startFabric.sh
./createPeerAdminCard.sh
```

### 2. 部署网络并创建参与者

```bash
# 克隆仓库并进入项目目录
git clone https://github.com/yourusername/mercy-Composer-MVP.git
cd mercy-Composer-MVP

# 安装依赖
npm install

# 创建业务网络归档
mkdir -p dist
composer archive create --sourceType dir --sourceName . -a ./dist/mercy-charity-mvp.bna

# 安装业务网络
composer network install --card PeerAdmin@hlfv1 --archiveFile dist/mercy-charity-mvp.bna

# 启动业务网络
composer network start --networkName mercy-charity-mvp --networkVersion 0.0.1 --networkAdmin admin --networkAdminEnrollSecret adminpw --card PeerAdmin@hlfv1 --file networkadmin.card

# 导入管理员卡片
composer card import --file networkadmin.card

# 验证网络连接
composer network ping --card admin@mercy-charity-mvp

# 运行初始化交易，创建默认参与者
composer transaction submit --card admin@mercy-charity-mvp -d '{"$class":"org.mercy.charity.SetupDemo"}'

# 为项目所有者创建身份
composer identity issue --card admin@mercy-charity-mvp -u projectowner1 -a "resource:org.mercy.charity.ProjectOwner#OWNER1" -x

# 为捐赠者创建身份
composer identity issue --card admin@mercy-charity-mvp -u donor1 -a "resource:org.mercy.charity.Donor#DONOR1" -x

# 导入身份卡片
composer card import --file projectowner1@mercy-charity-mvp.card
composer card import --file donor1@mercy-charity-mvp.card

# 验证身份连接
composer network ping --card projectowner1@mercy-charity-mvp
composer network ping --card donor1@mercy-charity-mvp
```

### 3. 使用 Composer Playground 进行交互

```bash
# 启动 Composer Playground
composer-playground
```

然后在浏览器中访问 http://localhost:8080 进入 Playground 界面。

#### 3.1 项目所有者创建项目

以项目所有者身份登录 Composer Playground：
1. 点击 "ID Registry"，然后导入 projectowner1@mercy-charity-mvp.card
2. 切换到 projectowner1@mercy-charity-mvp 身份
3. 在 "Assets" 选项卡中创建一个新的 Project 资产：

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

4. 点击 "Submit" 按钮提交交易，更新项目状态为 "已开始"：

```json
{
  "$class": "org.mercy.charity.UpdateProjectStatus",
  "project": "resource:org.mercy.charity.Project#PROJECT1",
  "newStatus": "STARTED"
}
```

#### 3.2 捐赠者捐赠资金

以捐赠者身份登录 Composer Playground：
1. 点击 "ID Registry"，然后切换到 donor1@mercy-charity-mvp 身份
2. 点击 "Submit Transaction" 按钮，提交捐赠交易：

```json
{
  "$class": "org.mercy.charity.MakeDonation",
  "donor": "resource:org.mercy.charity.Donor#DONOR1",
  "project": "resource:org.mercy.charity.Project#PROJECT1",
  "amount": 100000
}
```

此时项目状态将自动更新为 `FULLY_FUNDED`。

#### 3.3 项目所有者更新里程碑

重新切换到项目所有者身份，然后提交更新里程碑的交易：

```json
{
  "$class": "org.mercy.charity.UpdateMilestone",
  "project": "resource:org.mercy.charity.Project#PROJECT1",
  "milestoneId": "MS1",
  "isCompleted": true,
  "evidenceHash": "QmZ9mxUCZYP5KCxaFLRZf4EgC8sCmVuCzJf1YwfgcNDxQ1"
}
```

项目状态将自动更新为 `IN_PROGRESS`。

#### 3.4 捐赠者审核里程碑并释放资金

重新切换到捐赠者身份，然后提交审核里程碑的交易：

```json
{
  "$class": "org.mercy.charity.ApproveMilestoneFunding",
  "donor": "resource:org.mercy.charity.Donor#DONOR1",
  "project": "resource:org.mercy.charity.Project#PROJECT1",
  "milestoneId": "MS1",
  "approved": true
}
```

#### 3.5 完成后续里程碑

重复步骤 3.3 和 3.4 来完成后续的里程碑。

### 4. 使用命令行提交交易

也可以使用命令行工具提交交易：

```bash
# 项目所有者更新里程碑
composer transaction submit --card projectowner1@mercy-charity-mvp -d '{
  "$class": "org.mercy.charity.UpdateMilestone",
  "project": "resource:org.mercy.charity.Project#PROJECT1",
  "milestoneId": "MS2",
  "isCompleted": true,
  "evidenceHash": "QmT8z5gQc9M6ZVf8z8X1c5v2Y3Jf7KxabH6zZ5YvLNc9g"
}'

# 捐赠者审核并释放资金
composer transaction submit --card donor1@mercy-charity-mvp -d '{
  "$class": "org.mercy.charity.ApproveMilestoneFunding",
  "donor": "resource:org.mercy.charity.Donor#DONOR1",
  "project": "resource:org.mercy.charity.Project#PROJECT1",
  "milestoneId": "MS2",
  "approved": true
}'
```

### 5. 启动 REST API 服务器

要为业务网络启动 REST API 服务器，可以使用以下命令：

```bash
# 使用管理员身份启动 REST 服务器
composer-rest-server -c admin@mercy-charity-mvp -n never -u true -w true

# 使用项目所有者身份启动 REST 服务器
composer-rest-server -c projectowner1@mercy-charity-mvp -n never -u true -w true

# 使用捐赠者身份启动 REST 服务器
composer-rest-server -c donor1@mercy-charity-mvp -n never -u true -w true
```

然后在浏览器中访问 http://localhost:3000/explorer 来使用 REST API。

### 6. 使用 REST API 进行交互

启动 REST API 服务器后，可以使用以下示例 HTTP 请求进行交互：

#### 6.1 创建项目 (项目所有者)

```
POST /api/Project
{
  "$class": "org.mercy.charity.Project",
  "projectId": "PROJECT2",
  "name": "社区图书馆",
  "description": "为社区建设公共图书馆",
  "startDate": "2023-04-02T10:00:00.000Z",
  "endDate": "2023-12-31T10:00:00.000Z",
  "categories": ["education", "community"],
  "totalFundingRequired": 50000,
  "allocatedFunding": 0,
  "fundingStatus": "PENDING",
  "projectStatus": "REGISTERED",
  "milestones": [...],
  "teamMembers": [...],
  "owner": "resource:org.mercy.charity.ProjectOwner#OWNER1"
}
```

#### 6.2 捐赠资金 (捐赠者)

```
POST /api/MakeDonation
{
  "$class": "org.mercy.charity.MakeDonation",
  "donor": "resource:org.mercy.charity.Donor#DONOR1",
  "project": "resource:org.mercy.charity.Project#PROJECT2",
  "amount": 50000
}
```

#### 6.3 使用查询 API

REST API 还提供了对自定义查询的支持：

```
GET /api/queries/selectProjectsByStatus?status=IN_PROGRESS
GET /api/queries/selectDonationsByDonor?donorId=resource:org.mercy.charity.Donor#DONOR1
```

## 多种情境处理

### 捐赠者拒绝释放资金

如果捐赠者认为里程碑未完成或证据不充分，可以拒绝释放资金：

```json
{
  "$class": "org.mercy.charity.ApproveMilestoneFunding",
  "donor": "resource:org.mercy.charity.Donor#DONOR1",
  "project": "resource:org.mercy.charity.Project#PROJECT1",
  "milestoneId": "MS1",
  "approved": false
}
```

这种情况下，项目所有者需要解决问题并重新提交里程碑更新。

### 项目取消

如果项目需要取消，项目所有者可以更新项目状态：

```json
{
  "$class": "org.mercy.charity.UpdateProjectStatus",
  "project": "resource:org.mercy.charity.Project#PROJECT1",
  "newStatus": "CANCELLED"
}
```

取消后的项目不能接受新的捐赠，也不能更新里程碑状态。

## 关键注意事项

1. 里程碑完成顺序没有强制要求，但通常应按顺序完成
2. 捐赠者有权拒绝资金释放，这会暂停项目进展
3. 所有操作都记录在区块链上，确保透明和可追溯
4. 时间戳格式应为 ISO 8601 格式：`2023-04-02T10:00:00.000Z`
5. 确保使用正确的关系引用格式：`resource:org.mercy.charity.Donor#DONOR1`
6. 在 Hyperledger Composer 0.20 版本中，使用 `-a` 参数创建身份时，需要添加 `-x` 参数以生成身份卡片文件

## 故障排除

如果遇到问题，可以尝试以下解决方法：

1. **网络连接失败**：使用 `composer network ping` 命令检查网络连接
2. **访问控制错误**：检查 permissions.acl 文件中的权限设置
3. **交易处理错误**：检查交易处理函数中的逻辑和条件判断
4. **节点连接问题**：确保 Fabric 网络正在运行，可以使用 `docker ps` 命令查看容器状态
5. **清理环境**：如果遇到复杂问题，可以使用 `./teardownFabric.sh` 和 `./startFabric.sh` 重置环境 