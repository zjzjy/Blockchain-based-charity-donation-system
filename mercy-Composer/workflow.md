我已经详细检查了 mercy-Composer 文件夹的内容，整体逻辑清晰，代码结构完整，符合 Hyperledger Composer 的开发规范。

   项目所有者 → 创建项目 → 项目
               ↓
   管理员 → 审核项目 → 更新项目状态为"已审核"
               ↓
   捐赠者 → 捐赠资金 → 创建捐赠记录
               ↓
   项目所有者 → 更新里程碑 → 更新项目进度
               ↓
   审计员 → 审计项目 → 更新合规状态

以下是我的分析和运行流程建议：

## 代码检查结果

1. **数据模型 (charity.cto)**
   - 定义清晰，包含所有必要的资产、参与者和交易
   - 关系引用使用正确，如 `-->` 语法将 Donation 连接到 Donor 和 Project
   - 所有枚举类型定义适当

2. **交易处理逻辑**
   - `donorTransaction.js`: 捐赠者相关交易处理逻辑完整
   - `donationTransaction.js`: 捐赠流程处理合理，包含必要的验证
   - `projectTransaction.js`: 项目生命周期管理逻辑严谨

3. **访问控制规则 (permissions.acl)**
   - 基于角色的权限控制完善
   - 使用条件表达式限制资源访问
   - 包含系统级别权限设置

4. **项目配置 (package.json)**
   - 依赖版本正确，使用兼容的 Composer 版本
   - 脚本配置完善，便于部署和管理

## 运行可行性

项目可以在 Hyperledger Composer 上顺利运行，但需要注意以下几点：

1. 使用 Composer 0.20.x 版本，而非最新版本（Composer 项目已停止维护）
2. 需要正确配置 Fabric 环境（1.2 版本最兼容）
3. 确保网络管理员卡片正确创建和导入

## 完整展示流程的操作顺序

### 1. 环境准备

```bash
# 安装必要工具
npm install -g composer-cli@0.20
npm install -g composer-rest-server@0.20
npm install -g generator-hyperledger-composer@0.20
npm install -g composer-playground@0.20
npm install -g yo

# 设置 Fabric 环境
mkdir ~/fabric-dev-servers && cd ~/fabric-dev-servers
curl -O https://raw.githubusercontent.com/hyperledger/composer-tools/master/packages/fabric-dev-servers/fabric-dev-servers.tar.gz
tar -xvf fabric-dev-servers.tar.gz

# 启动 Fabric
export FABRIC_VERSION=hlfv12
./startFabric.sh
./createPeerAdminCard.sh
```

### 2. 部署业务网络

```bash
# 进入项目目录
cd mercy-Composer

# 安装依赖
npm install

# 创建业务网络归档文件
mkdir -p dist
composer archive create --sourceType dir --sourceName . -a ./dist/mercy-charity.bna

# 安装业务网络
composer network install --card PeerAdmin@hlfv1 --archiveFile dist/mercy-charity.bna

# 启动业务网络
composer network start --networkName mercy-charity --networkVersion 0.0.1 --networkAdmin admin --networkAdminEnrollSecret adminpw --card PeerAdmin@hlfv1 --file networkadmin.card

# 导入管理员卡片
composer card import --file networkadmin.card

# 验证网络部署
composer network ping --card admin@mercy-charity
```

### 3. 启动 Composer Playground 进行演示

```bash
composer-playground
```

在浏览器打开 http://localhost:8080，使用导入的卡片访问业务网络。

### 4. 部署 REST API 服务器（可选）

```bash
composer-rest-server -c admin@mercy-charity -n never -u true -w true
```

### 5. 演示流程顺序

1. **创建参与者**：

   a. 创建审计员 (Auditor)：
   ```json
   {
     "$class": "org.mercy.charity.Auditor",
     "auditorId": "AUDITOR1",
     "name": "李审计",
     "email": "auditor@example.com",
     "organization": "诚信审计"
   }
   ```

   b. 创建管理员 (Admin)：
   ```json
   {
     "$class": "org.mercy.charity.Admin",
     "adminId": "ADMIN1",
     "name": "张管理",
     "email": "admin@example.com"
   }
   ```

   c. 创建项目所有者 (ProjectOwner)：
   ```json
   {
     "$class": "org.mercy.charity.ProjectOwner",
     "projectOwnerId": "OWNER1",
     "name": "王项目",
     "email": "owner@example.com",
     "phone": "13800138000",
     "isVerified": true,
     "projectIds": []
   }
   ```

   d. 创建捐赠者 (Donor)：
   ```json
   {
     "$class": "org.mercy.charity.Donor",
     "donorId": "DONOR1",
     "name": "赵捐赠",
     "email": "donor@example.com",
     "phone": "13900139000",
     "walletAddress": "0x1234567890abcdef",
     "kycVerified": false,
     "preferredCategories": ["education", "disaster"],
     "totalDonatedAmount": 0,
     "registrationDate": "2023-04-02T10:00:00.000Z",
     "status": "ACTIVE"
   }
   ```

2. **KYC 验证**：

   执行 UpdateKYCStatus 交易：
   ```json
   {
     "$class": "org.mercy.charity.UpdateKYCStatus",
     "donor": "resource:org.mercy.charity.Donor#DONOR1",
     "isVerified": true
   }
   ```

3. **创建项目**：

   a. 创建项目 (Project)：
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
         "isCompleted": false
       },
       {
         "milestoneId": "MS2",
         "description": "完成地基建设",
         "deadline": "2023-07-30T10:00:00.000Z",
         "fundingAmount": 30000,
         "isCompleted": false
       },
       {
         "milestoneId": "MS3",
         "description": "完成主体建设",
         "deadline": "2023-10-30T10:00:00.000Z",
         "fundingAmount": 50000,
         "isCompleted": false
       },
       {
         "milestoneId": "MS4",
         "description": "完成内部装修",
         "deadline": "2023-12-15T10:00:00.000Z",
         "fundingAmount": 10000,
         "isCompleted": false
       }
     ],
     "teamMembers": [
       {
         "memberId": "TM1",
         "name": "李工程",
         "role": "项目经理",
         "contactInfo": "manager@example.com"
       },
       {
         "memberId": "TM2",
         "name": "钱建筑",
         "role": "建筑师",
         "contactInfo": "architect@example.com"
       }
     ],
     "partners": [
       {
         "partnerId": "PT1",
         "name": "希望建筑公司",
         "type": "建筑合作伙伴",
         "contactInfo": "builder@example.com"
       }
     ],
     "complianceStatus": "UNVERIFIED",
     "auditReportHash": "",
     "registrationNumber": "REG202304001",
     "owner": "resource:org.mercy.charity.ProjectOwner#OWNER1"
   }
   ```

   b. 更新项目状态为开始：
   ```json
   {
     "$class": "org.mercy.charity.UpdateProjectStatus",
     "project": "resource:org.mercy.charity.Project#PROJECT1",
     "newStatus": "STARTED"
   }
   ```

4. **捐赠交易**：

   执行 MakeDonation 交易：
   ```json
   {
     "$class": "org.mercy.charity.MakeDonation",
     "donor": "resource:org.mercy.charity.Donor#DONOR1",
     "project": "resource:org.mercy.charity.Project#PROJECT1",
     "amount": 50000
   }
   ```

5. **更新项目里程碑**：

   a. 更新第一个里程碑：
   ```json
   {
     "$class": "org.mercy.charity.UpdateMilestone",
     "project": "resource:org.mercy.charity.Project#PROJECT1",
     "milestoneId": "MS1",
     "isCompleted": true
   }
   ```

   b. 更新第二个里程碑：
   ```json
   {
     "$class": "org.mercy.charity.UpdateMilestone",
     "project": "resource:org.mercy.charity.Project#PROJECT1",
     "milestoneId": "MS2",
     "isCompleted": true
   }
   ```

6. **再次捐赠**：

   执行另一次 MakeDonation 交易：
   ```json
   {
     "$class": "org.mercy.charity.MakeDonation",
     "donor": "resource:org.mercy.charity.Donor#DONOR1",
     "project": "resource:org.mercy.charity.Project#PROJECT1",
     "amount": 50000
   }
   ```

7. **完成剩余里程碑**：

   ```json
   {
     "$class": "org.mercy.charity.UpdateMilestone",
     "project": "resource:org.mercy.charity.Project#PROJECT1",
     "milestoneId": "MS3",
     "isCompleted": true
   }
   ```

   ```json
   {
     "$class": "org.mercy.charity.UpdateMilestone",
     "project": "resource:org.mercy.charity.Project#PROJECT1",
     "milestoneId": "MS4",
     "isCompleted": true
   }
   ```

8. **完成项目**：

   ```json
   {
     "$class": "org.mercy.charity.UpdateProjectStatus",
     "project": "resource:org.mercy.charity.Project#PROJECT1",
     "newStatus": "COMPLETED"
   }
   ```

9. **查询和验证**：
   - 查询所有捐赠记录
   - 查询项目详情
   - 查询捐赠者信息，确认总捐赠金额已更新

## 关键注意事项

1. 确保交易按照正确的顺序执行（例如，捐赠前必须先进行KYC验证）
2. 在创建资产和参与者时，确保ID唯一
3. 关系引用格式必须正确：`resource:org.mercy.charity.Donor#DONOR1`
4. 时间戳格式应为 ISO 8601 格式：`2023-04-02T10:00:00.000Z`

以上流程展示了整个系统的核心功能，包括参与者创建、项目管理、捐赠流程和项目完成的全生命周期。

## 在Composer中实现多角色交互
1. 创建多个身份卡片
``` bash
   # 为项目所有者创建身份
   composer identity issue -c admin@mercy-charity -u projectowner1 -a "resource:org.mercy.charity.ProjectOwner#OWNER1"
   
   # 为捐赠者创建身份
   composer identity issue -c admin@mercy-charity -u donor1 -a "resource:org.mercy.charity.Donor#DONOR1"
   
   # 为审计员创建身份
   composer identity issue -c admin@mercy-charity -u auditor1 -a "resource:org.mercy.charity.Auditor#AUDITOR1"
   
   # 为管理员创建身份
   composer identity issue -c admin@mercy-charity -u admin1 -a "resource:org.mercy.charity.Admin#ADMIN1"
``` 
2. 导入身份卡片
```bash
   # 导入各角色的身份卡片
   composer card import -f projectowner1@mercy-charity.card
   composer card import -f donor1@mercy-charity.card
   composer card import -f auditor1@mercy-charity.card
   composer card import -f admin1@mercy-charity.card
```
3.使用不同身份进行操作
```bash
   # 使用项目所有者身份查询项目
   composer network list -c projectowner1@mercy-charity
   
   # 使用捐赠者身份提交捐赠交易
   composer transaction submit -c donor1@mercy-charity -d '{"$class":"org.mercy.charity.MakeDonation",...}'
```
## 在页面上直接操作？
是的，您可以直接在 Hyperledger Composer Playground 网页界面上进行不同角色的创建和操作各角色间的交互。这是 Composer Playground 的主要优势之一，它提供了一个直观的可视化界面，无需编写命令行代码就能完成业务网络的测试和管理。以下是详细步骤：

## 在 Composer Playground 中创建和切换不同角色

### 1. 启动 Composer Playground

```bash
composer-playground
```

在浏览器中访问 http://localhost:8080

### 2. 使用管理员卡片连接业务网络

- 在初始界面选择 `admin@mercy-charity` 卡片
- 点击 "Connect now" 进入业务网络

### 3. 创建参与者

在 Composer Playground 中：

1. 点击左侧导航栏的 "Test" 标签
2. 在 "Participants" 部分点击 "Create New Participant"
3. 选择要创建的参与者类型（如 `org.mercy.charity.Donor`）
4. 在编辑器中填写参与者信息的 JSON 数据
5. 点击 "Create New" 按钮提交

例如，创建一个捐赠者：
```json
{
  "$class": "org.mercy.charity.Donor",
  "donorId": "DONOR1",
  "name": "赵捐赠",
  "email": "donor@example.com",
  "phone": "13900139000",
  "walletAddress": "0x1234567890abcdef",
  "kycVerified": false,
  "preferredCategories": ["education", "disaster"],
  "totalDonatedAmount": 0,
  "registrationDate": "2023-04-02T10:00:00.000Z",
  "status": "ACTIVE"
}
```

### 4. 为参与者创建身份

1. 点击左侧 "Admin" 标签
2. 选择 "ID Registry"
3. 点击 "Issue New ID" 按钮
4. 填写以下信息：
   - ID Name：例如 "donor1"
   - Participant：选择要关联的参与者（如刚创建的 DONOR1）
5. 点击 "Create New" 按钮
6. 系统会提示下载新的身份卡片，点击 "Add to My Wallet"

### 5. 切换身份

1. 点击右上角的当前身份卡片名称（如 "admin@mercy-charity"）
2. 在下拉菜单中选择 "My Business Networks"
3. 选择刚才创建的身份卡片（如 "donor1@mercy-charity"）
4. 点击 "Use Now" 按钮
5. 现在您已经以捐赠者身份登录

### 6. 对每个角色重复上述步骤

按照同样的方法为项目所有者、审计员等角色创建参与者和身份卡片。

## 在 Composer Playground 中实现多角色交互

### 1. 以项目所有者身份创建项目

1. 切换到项目所有者身份卡片
2. 点击 "Assets" 标签
3. 选择 "Project" 资产类型
4. 点击 "Create New Asset" 按钮
5. 填写项目信息的 JSON 数据
6. 点击 "Create New" 按钮提交

### 2. 以管理员身份审核项目

1. 切换到管理员身份卡片
2. 点击 "Submit Transaction" 按钮
3. 选择 "UpdateProjectStatus" 交易类型
4. 填写交易数据，将项目状态更新为 "STARTED"
5. 点击 "Submit" 按钮

### 3. 以捐赠者身份进行捐赠

1. 切换到捐赠者身份卡片
2. 点击 "Submit Transaction" 按钮
3. 选择 "MakeDonation" 交易类型
4. 填写捐赠信息
5. 点击 "Submit" 按钮

### 4. 以项目所有者身份更新里程碑

1. 切换回项目所有者身份卡片
2. 点击 "Submit Transaction" 按钮
3. 选择 "UpdateMilestone" 交易类型
4. 填写里程碑更新信息
5. 点击 "Submit" 按钮

### 5. 以审计员身份进行审计

1. 切换到审计员身份卡片
2. 查看项目和捐赠信息
3. 提交交易更新项目的合规状态

## 体验不同角色的权限限制

在切换不同角色时，您会注意到 Composer Playground 界面会根据当前身份的权限显示不同的操作选项：

1. **捐赠者角色**
   - 可以查看所有项目
   - 只能查看自己的捐赠记录
   - 只能执行捐赠交易
   - 无法修改项目信息

2. **项目所有者角色**
   - 可以创建和更新自己的项目
   - 可以更新项目里程碑
   - 无法更改其他项目所有者的项目

3. **管理员角色**
   - 可以查看和管理所有资源
   - 可以执行所有交易

4. **审计员角色**
   - 可以查看所有资源
   - 只能更新项目的合规状态

### 实际操作中的注意事项

1. **关系引用格式**
   - 在填写交易数据时，关系引用必须使用正确的格式
   - 例如：`resource:org.mercy.charity.Donor#DONOR1`

2. **KYC 验证状态**
   - 捐赠者必须先通过 KYC 验证才能进行捐赠
   - 您可以先以管理员身份更新捐赠者的 KYC 状态

3. **错误处理**
   - 如果某个操作被权限规则拒绝，Playground 会显示错误信息
   - 这些错误信息有助于理解不同角色的权限边界

4. **时间戳格式**
   - 使用 ISO 8601 格式的时间戳：`2023-04-02T10:00:00.000Z`

Composer Playground 的这种交互式界面非常适合演示和测试区块链业务网络，让您可以直观地体验不同角色在慈善捐赠系统中的权限和交互方式，无需编写复杂的代码或命令。
