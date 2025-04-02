# Mercy慈善捐赠系统工作流程

本文档详细描述了Mercy区块链慈善系统中的完整工作流程，从网络设置、管理员注册到捐赠者和慈善机构交互的全过程。

## 项目概述

Mercy是一个基于Hyperledger Fabric的区块链慈善捐赠系统，提供透明、安全和高效的捐赠管理解决方案。主要功能包括：

1. 捐赠者管理：注册、验证、历史追踪
2. 项目管理：创建、里程碑管理、资金分配
3. 捐赠管理：安全捐赠、交易记录、资金追踪

## 系统架构

系统采用双组织结构，由以下主要组件构成：

- **DonorOrg组织**：代表捐赠方的组织，负责捐赠者注册、验证和捐赠交易背书
- **CharityOrg组织**：代表慈善机构的组织，负责项目创建、管理和资金分配
- **区块链智能合约**：实现捐赠、项目管理等业务逻辑
- **区块链网络**：存储交易和状态数据
- **后端API**：处理请求并与区块链交互
- **前端界面**：用户操作界面

## 文件结构
mercy/
│
├── README.md                     # 项目说明文档
├── package.json                  # 项目依赖配置
├── index.js                      # 主入口文件
├── permissions.acl               # 访问控制列表
├── flow.md                       # 流程说明文档
├── workflow.md                   # 工作流程文档
├── Learn_1.md                    # 学习指南
├── expected_output.md            # 预期输出说明
│
├── lib/                          # 智能合约核心库
│   ├── donationContract.js       # 捐赠合约 (11KB, 263行)
│   ├── donorContract.js          # 捐赠者合约 (11KB, 279行)
│   └── projectContract.js        # 项目合约 (42KB, 995行)
│
├── models/                       # 数据模型
│   └── charity.cto               # 慈善领域模型定义
│
├── config/                       # 配置文件
│   ├── connection.json           # 区块链连接配置 (4.2KB, 113行)
│   └── .env                      # 环境变量配置 (4.3KB, 89行)
│
├── api/                          # API接口
│   ├── donor.js                  # 捐赠者API (5.5KB, 165行)
│   ├── project.js                # 项目API (9.6KB, 294行)
│   ├── donation.js               # 捐赠API (7.3KB, 222行)
│   ├── milestone.js              # 里程碑API (5.8KB, 174行)
│   └── projectOwner.js           # 项目所有者API (7.5KB, 210行)
│
├── scripts/                      # 交互脚本
│   ├── enrollAdmin.js            # 管理员注册 (8.4KB, 230行)
│   ├── registerDonor.js          # 注册捐赠者 (7.5KB, 186行)
│   ├── verifyDonor.js            # 验证捐赠者 (4.7KB, 118行)
│   ├── registerProjectOwner.js   # 注册项目所有者 (7.3KB, 180行)
│   ├── createProject.js          # 创建项目 (8.8KB, 209行)
│   ├── queryProject.js           # 查询项目 (6.2KB, 138行)
│   ├── updateProjectStatus.js    # 更新项目状态 (5.6KB, 129行)
│   ├── updateMilestone.js        # 更新里程碑 (6.1KB, 136行)
│   ├── allocateFunds.js          # 资金分配 (5.3KB, 119行)
│   └── givemoney.js              # 执行捐赠 (8.8KB, 218行)
│
├── network/                      # 网络配置
│   ├── docker-compose.yaml       # Docker编排配置
│   └── network.sh                # 网络启动脚本
│
├── backend/                      # 后端应用
│   ├── package.json              # 后端依赖配置 (600B, 26行)
│   └── src/                      # 后端源码
│       ├── index.js              # 后端入口点 (1.8KB, 59行)
│       ├── controllers/          # 控制器
│       │   ├── donorController.js         # 捐赠者控制器 (5.3KB, 176行)
│       │   ├── projectController.js       # 项目控制器 (8.2KB, 272行)
│       │   ├── donationController.js      # 捐赠控制器 (6.6KB, 215行)
│       │   ├── milestoneController.js     # 里程碑控制器 (5.5KB, 179行)
│       │   └── projectOwnerController.js  # 项目所有者控制器 (4.0KB, 132行)
│       ├── routes/               # 路由
│       │   ├── donorRoutes.js             # 捐赠者路由 (428B, 16行)
│       │   ├── projectRoutes.js           # 项目路由 (607B, 22行)
│       │   ├── donationRoutes.js          # 捐赠路由 (575B, 19行)
│       │   ├── milestoneRoutes.js         # 里程碑路由 (517B, 16行)
│       │   └── projectOwnerRoutes.js      # 项目所有者路由 (693B, 18行)
│       ├── middleware/           # 中间件
│       └── utils/                # 工具函数
│           └── logger.js         # 日志工具 (812B, 31行)
│
├── frontend/                     # 前端应用
│   ├── package.json              # 前端依赖配置 (846B, 39行)
│   └── src/                      # 前端源码
│       ├── components/           # UI组件
│       │   ├── DonorForm.js                # 捐赠者表单 (4.0KB, 120行)
│       │   ├── ProjectForm.js              # 项目表单 (6.0KB, 168行)
│       │   ├── DonationForm.js             # 捐赠表单 (3.3KB, 102行)
│       │   ├── MilestoneForm.js            # 里程碑表单 (2.7KB, 77行)
│       │   └── ProjectOwnerForm.js         # 项目所有者表单 (2.1KB, 81行)
│       └── services/             # 服务
│           └── api.js            # API调用服务 (2.8KB, 112行)
│
└── test/                         # 测试目录

## 执行流程

### 步骤1：环境准备

启动Hyperledger Fabric网络，部署智能合约：

```bash
cd mercy/network
./network.sh up
./network.sh deploy
```

**涉及文件**：
- `mercy/network/network.sh`：网络管理脚本
- `mercy/network/docker-compose.yaml`：包含DonorOrg和CharityOrg节点的Docker配置
- `mercy/config/connection.json`：双组织结构的网络连接配置

**评估**：
- 检查点1：确保网络配置文件中的路径与本地路径匹配
- 检查点2：检查Docker服务是否正常运行
- 检查点3：确认两个组织的CA服务和peer节点都已启动

### 步骤2：注册管理员(Admin)

为DonorOrg和CharityOrg组织注册管理员用户：

```bash
# 注册两个组织的管理员
node scripts/enrollAdmin.js

# 也可以单独注册特定组织的管理员
# node scripts/enrollAdmin.js donor    # 仅注册DonorOrg管理员
# node scripts/enrollAdmin.js charity  # 仅注册CharityOrg管理员
```

**涉及文件**：
- `mercy/scripts/enrollAdmin.js`：管理员注册脚本
- `mercy/config/connection.json`：包含CA配置的连接文件
- `mercy/config/.env`：环境变量配置

**评估**：
- 检查点1：确认CA服务器正常运行
- 检查点2：检查钱包目录是否已创建
- 检查点3：验证管理员身份是否已成功存储（admin, admin-donororg, admin-charityorg）

### 步骤3：注册项目所有者（慈善机构）

使用管理员身份注册慈善机构作为项目所有者：

```bash
# 使用管理员身份注册红十字会作为项目所有者
node scripts/registerProjectOwner.js redcross001 "中国红十字会" "contact@redcross.org.cn" "01062555555" "北京市东城区干面胡同53号"
```

**涉及文件**：
- `mercy/scripts/registerProjectOwner.js`：项目所有者注册脚本
- `mercy/lib/projectContract.js`：项目智能合约
- `mercy/models/charity.cto`：数据模型定义

**评估**：
- 检查点1：确认使用了有效的管理员身份（默认、DonorOrg或CharityOrg管理员）
- 检查点2：验证项目所有者数据的完整性和格式

### 步骤4：注册捐赠者

在系统中注册捐赠者：

```bash
# 注册王先生作为捐赠者
node scripts/registerDonor.js donor001 "王大力" "wang@example.com" "13800138000" "0xabcd1234wallet"
```

**涉及文件**：
- `mercy/scripts/registerDonor.js`：捐赠者注册脚本
- `mercy/lib/donorContract.js`：捐赠者智能合约
- `mercy/models/charity.cto`：数据模型

**评估**：
- 检查点：确认捐赠者注册时使用了DonorOrg组织的背书节点

### 步骤5：捐赠者KYC验证

对注册的捐赠者进行KYC验证，授权其进行捐赠操作：

```bash
# 由管理员验证捐赠者身份
node scripts/verifyDonor.js donor001
```

**涉及文件**：
- `mercy/scripts/verifyDonor.js`：捐赠者验证脚本
- `mercy/lib/donorContract.js`：捐赠者智能合约
- `mercy/lib/kycService.js`：KYC验证服务（如存在）

### 步骤6：创建慈善项目

由注册的项目所有者创建慈善项目：

```bash
# 红十字会创建灾区重建项目
node scripts/createProject.js project001 "四川地震灾区重建" "为地震灾区重建学校和基础设施" "2023-05-01" "2024-05-01" "灾难,重建,教育" 5000000 redcross001
```

**涉及文件**：
- `mercy/scripts/createProject.js`：项目创建脚本
- `mercy/lib/projectContract.js`：项目智能合约
- `mercy/models/charity.cto`：数据模型

**评估**：
- 检查点1：确认使用了CharityOrg组织的背书节点
- 检查点2：验证项目创建者是已注册的项目所有者

### 步骤7：项目状态更新与初审

项目创建后更新其状态为"进行中"：

```bash
# 更新项目状态
node scripts/updateProjectStatus.js project001 "IN_PROGRESS"
```

**涉及文件**：
- `mercy/scripts/updateProjectStatus.js`：状态更新脚本
- `mercy/lib/projectContract.js`：项目智能合约

### 步骤8：捐赠者进行捐赠

已验证的捐赠者向项目进行捐赠：

```bash
# 王先生向灾区重建项目捐款10000元
node scripts/givemoney.js donation001 donor001 project001 10000
```

**涉及文件**：
- `mercy/scripts/givemoney.js`：捐赠脚本
- `mercy/lib/donationContract.js`：捐赠智能合约
- `mercy/lib/donorContract.js`：捐赠者智能合约
- `mercy/lib/projectContract.js`：项目智能合约

**评估**：
- 检查点1：确认捐赠者已通过KYC验证
- 检查点2：验证项目状态允许接受捐赠
- 检查点3：确认交易由DonorOrg和CharityOrg共同背书

### 步骤9：查询项目状态

查询项目的当前状态和筹款进度：

```bash
# 查询项目状态
node scripts/queryProject.js project001
```

**涉及文件**：
- `mercy/scripts/queryProject.js`：项目查询脚本
- `mercy/lib/projectContract.js`：项目智能合约

### 步骤10：添加项目里程碑

为项目添加执行里程碑：

```bash
# 添加项目里程碑
node scripts/addMilestone.js project001 milestone001 "完成地基建设" "2023-08-01" 1000000
```

**涉及文件**：
- `mercy/lib/projectContract.js`：项目智能合约中的里程碑管理功能
- `mercy/scripts/addMilestone.js`：里程碑添加脚本（如存在）

### 步骤11：更新里程碑完成状态

项目完成里程碑后更新状态：

```bash
# 更新里程碑状态为已完成
node scripts/updateMilestone.js project001 milestone001 true "2023-07-20"
```

**涉及文件**：
- `mercy/scripts/updateMilestone.js`：里程碑更新脚本
- `mercy/lib/projectContract.js`：项目智能合约

### 步骤12：资金分配

根据里程碑完成情况分配资金：

```bash
# 分配资金到已完成的里程碑
node scripts/allocateFunds.js project001 milestone001 1000000
```

**涉及文件**：
- `mercy/scripts/allocateFunds.js`：资金分配脚本
- `mercy/lib/projectContract.js`：项目智能合约

## 多组织交互流程

在双组织结构下，DonorOrg和CharityOrg在不同阶段有不同的职责：

1. **DonorOrg主导的流程**：
   - 捐赠者注册和验证
   - 捐赠交易的发起
   - 捐赠记录的查询

2. **CharityOrg主导的流程**：
   - 项目所有者注册
   - 项目创建和管理
   - 里程碑管理
   - 资金分配

3. **共同参与的流程**：
   - 捐赠交易的背书
   - 项目状态更新的背书
   - 智能合约部署和升级

## 总体评估

### 系统功能完整性

- **基础功能**：系统实现了捐赠者注册、项目创建、捐赠操作、项目查询等基础功能
- **高级功能**：KYC验证、里程碑管理、资金分配等高级功能已设计但实现程度不同
- **多组织支持**：系统现支持DonorOrg和CharityOrg两个组织，提供更完善的权限隔离和治理机制

### 安全性评估

- **双组织治理**：通过DonorOrg和CharityOrg的双方治理增强了系统的安全性和公平性
- **KYC验证**：系统设计了KYC验证机制，防止非法资金流动
- **权限控制**：通过`permissions.acl`文件实现了基于角色的访问控制
- **交易验证**：通过区块链的共识机制确保交易的不可篡改性

### 改进建议

1. **用户体验**：开发更友好的前端界面，简化操作流程
2. **监控工具**：添加系统监控和分析工具，提供实时数据
3. **批量操作**：增加批量处理功能，提高效率
4. **移动端支持**：开发移动应用，扩大用户覆盖面

### 结论

Mercy慈善捐赠系统通过区块链技术实现了捐赠过程的透明化和不可篡改，双组织架构进一步增强了系统的安全性和公平性。系统为捐赠者、慈善机构和受益人提供了可信的平台，有效解决了传统慈善领域的信任问题。

##  Mercy系统的前后端API工作流程

整个系统的工作流程涉及四个主要部分：前端组件、API服务层、后端控制器和区块链智能合约。下面详细解释它们如何联动工作。

### 1. 工作流程概述

``` text
前端组件 → API服务 → 后端控制器 → 区块链智能合约
   ↑                                  ↓
   └──────────────响应数据────────────┘
```

### 2. 前端组件到API服务

前端组件通过`services/api.js`中定义的函数与后端通信：

```javascript
// 发起捐赠的流程示例
const handleSubmit = async (e) => {
    e.preventDefault();
    try {
        // 调用API服务函数
        const response = await makeDonation({
            donorId: "D001",
            projectId: "P001", 
            amount: 1000
        });
        
        // 处理响应
        if (response.data.success) {
            // 成功处理
        }
    } catch (error) {
        // 错误处理
    }
};
```

`api.js`定义了所有API端点：

```javascript
// API服务定义
export const makeDonation = (data) => {
  return api.post('/donation', data);  // 向后端发送POST请求
};
```

### 3. API服务到后端控制器

API请求到达后端`index.js`，通过路由分发到对应控制器：

```javascript
// 后端路由配置
app.use('/api/donation', donationRoutes);

// donation路由定义
router.post('/', donationController.createDonation);
```

### 4. 后端控制器到区块链智能合约

控制器处理请求并调用区块链智能合约：

```javascript
// 创建捐赠的控制器函数
const createDonation = async (req, res) => {
    try {
        const { donorId, projectId, amount } = req.body;
        
        // 连接区块链网络
        if (!donationContract) {
            await initialize(); // 初始化网络连接
        }
        
        // 调用智能合约
        const result = await donationContract.submitTransaction(
            'createDonation', donorId, projectId, amount.toString()
        );
        
        // 返回结果给前端
        return res.status(201).json({
            success: true,
            message: '捐赠创建成功',
            data: JSON.parse(result.toString())
        });
    } catch (error) {
        // 错误处理
    }
};
```

### 5. 与脚本的区别和联动

系统中有两种与区块链交互的方式：

1. **API/控制器方式**：通过前端UI触发，适合用户交互场景
   - 例如：用户注册、创建项目、捐赠等

2. **脚本方式**：直接通过命令行执行，适合管理任务或批处理
   - 例如：初始化网络、注册管理员等

**联动方式**：
- 脚本和API控制器共享相同的区块链连接方法
- 两者都使用相同的智能合约方法
- 区别在于触发方式和返回结果的处理方式

### 6. 使用方法示例

#### 注册捐赠者流程

1. **前端**：用户填写表单，点击提交
   ```jsx
   <DonorForm onSuccess={handleSuccess} />
   ```

2. **API服务**：发送请求
   ```javascript
   registerDonor({donorId, name, email, phone})
   ```

3. **后端路由**：接收请求
   ```javascript
   router.post('/', donorController.registerDonor);
   ```

4. **控制器**：处理逻辑
   ```javascript
   const result = await contract.submitTransaction(
       'registerDonor', donorId, name, email, phone
   );
   ```

5. **区块链**：执行智能合约，更新状态

6. **响应链**：返回结果给前端，更新UI

#### 项目资金分配流程

1. **前端**：管理员选择项目和里程碑，提交资金分配
   ```jsx
   <AllocationForm projectId="P001" milestoneId="M001" amount={5000} />
   ```

2. **后端控制器**：验证权限，调用智能合约
   ```javascript
   const result = await projectContract.submitTransaction(
       'allocateFundsToMilestone', projectId, milestoneId, amount
   );
   ```

3. **智能合约**：验证里程碑状态，更新资金分配记录
   ```javascript
   // 在智能合约中
   if (!milestone.isCompleted) {
       throw new Error('里程碑尚未完成，无法分配资金');
   }
   ```

### 7. 完整流程示例：捐赠流程

1. 捐赠者在前端填写捐赠表单
2. 点击提交按钮，触发`handleSubmit`函数
3. 前端调用`makeDonation` API服务函数
4. 请求发送到后端`/api/donation`路由
5. 路由调用`donationController.createDonation`控制器方法
6. 控制器连接区块链，调用`createDonation`智能合约方法
7. 智能合约执行业务逻辑：验证捐赠者、更新项目资金状态
8. 结果返回给控制器，再返回给前端
9. 前端显示捐赠成功消息，并可能更新项目状态显示

通过这种方式，前端、API、后端和区块链智能合约形成了一个完整的工作流程，确保数据的安全性和一致性。

