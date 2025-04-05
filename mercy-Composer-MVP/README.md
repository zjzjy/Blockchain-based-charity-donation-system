# 慈善捐赠系统 MVP 版本（基于Hyperledger Composer）

> 基于 Hyperledger Composer 的慈善捐赠管理系统最小可行产品(MVP)版本，专注于项目所有者和捐赠者之间的直接互动。系统通过区块链技术确保捐赠资金的透明管理，并由捐赠者直接参与决策项目资金的释放。

## 系统特点

- **角色简化**：仅保留项目所有者和捐赠者两个角色
- **里程碑驱动**：项目资金按里程碑分阶段释放
- **捐赠者决策**：由捐赠者审核里程碑完成情况并决定是否释放下一步善款
- **透明追踪**：所有捐赠和资金释放行为在区块链上记录，不可篡改

## 项目结构
```
mercy-Composer-MVP/
├── models/                    # 数据模型定义
│   └── charity.cto           # 业务网络定义文件
├── lib/                      # 交易处理逻辑
│   ├── donationTransaction.js # 捐赠相关交易处理器
│   ├── projectTransaction.js  # 项目相关交易处理器
│   └── setup.js              # 网络初始化脚本
├── permissions/              # 访问控制规则
│   └── permissions.acl       # 访问控制列表(ACL)
├── queries.qry              # CQRS查询定义
└── test/                    # 测试用例
    ├── participants/        # 参与者测试
    │   ├── donor/          # 捐赠者测试
    │   └── project_owner/  # 项目所有者测试
    ├── assets/             # 资产测试
    │   ├── donation/       # 捐赠资产测试
    │   └── project/        # 项目资产测试
    └── transactions/       # 交易测试
        ├── 01_setup_demo/  # 系统初始化测试
        ├── 02_make_donation/ # 捐赠交易测试
        ├── 03_update_project_status/ # 项目状态更新测试
        ├── 04_approve_milestone_funding/ # 里程碑资金审批测试
        └── 05_update_milestone/ # 里程碑更新测试
```

### 关键文件说明

| 文件 | 说明 |
|------|------|
| `charity.cto` | 包含参与者、资产和交易的核心模型定义 |
| `*.js` | 交易处理器包含业务逻辑验证规则 |
| `permissions.acl` | 定义各角色的CRUD权限 |
| `setup_demo.json` | 初始化测试数据模板 |

## 业务流程

1. **项目创建**：项目所有者创建慈善项目，定义多个带有资金需求的里程碑
2. **捐赠资金**：捐赠者向项目捐赠资金
3. **里程碑完成**：项目所有者完成里程碑并提交证据
4. **资金释放**：捐赠者审核里程碑完成情况，决定是否释放资金
5. **项目完成**：所有里程碑完成并获得资金释放后，项目标记为完成

## 安装与部署

### 前提条件

1. **安装 Hyperledger Composer 开发环境**
   ```bash
   npm install -g composer-cli@0.20
   npm install -g composer-rest-server@0.20
   npm install -g generator-hyperledger-composer@0.20
   npm install -g composer-playground@0.20
   ```

2. **启动 Fabric 网络**
   ```bash
   cd ~/fabric-dev-servers
   export FABRIC_VERSION=hlfv12
   ./startFabric.sh
   ./createPeerAdminCard.sh
   ```

### 部署业务网络

1. **克隆项目**
   ```bash
   git clone git https://github.com/zjzjy/Blockchain-based-charity-donation-system.git
   cd mercy-Composer-MVP
   ```

2. **安装依赖**
   ```bash
   npm install
   ```

3. **创建和部署业务网络**
   ```bash
   mkdir -p dist
   composer archive create --sourceType dir --sourceName . -a ./dist/mercy-charity-mvp.bna
   composer network install --card PeerAdmin@hlfv1 --archiveFile dist/mercy-charity-mvp.bna
   composer network start --networkName mercy-charity-mvp --networkVersion 0.0.1 --networkAdmin admin --networkAdminEnrollSecret adminpw --card PeerAdmin@hlfv1 --file networkadmin.card
   composer card import --file networkadmin.card
   ```

### 启动 Composer Playground

```bash
nohup composer-playground -p 8080 -d &
```

通过浏览器访问 http://本文作者团队域名:8080 进入 Composer Playground。

## 使用演示

### 1. 创建参与者身份

系统提供了 `SetupDemo` 交易来创建默认的参与者。交易内容如下：

```json
{
  "$class": "org.mercy.charity.SetupDemo"
}
```

提交此交易后，系统将创建以下默认参与者：
- 项目所有者：李工 (OWNER1)
- 捐赠者：张三 (DONOR1)

随后，通过 id registry 为这两个参与者创建身份卡片，卡片内容示例如下：

| 身份 | ID | 角色 | 状态 |
|------|----|------|------|
| Rural Education Support Program | OWNER001 | ProjectOwner | ACTIVATED |
| zhangsan | DONOR001 | Donor | ACTIVATED |

### 2. 项目所有者创建项目

以项目所有者身份登录 Composer Playground，并创建一个包含多个里程碑的项目。创建项目的代码示例请参见文件：

`test/assets/projects/01_create_project1.json`

### 3. 捐赠者捐赠资金

以捐赠者身份登录，提交捐赠交易。捐赠交易的代码示例请参见文件：

`test/transactions/02_make_donation/03_make_donation1.json`

### 4. 项目所有者完成里程碑

以项目所有者身份登录，更新里程碑的状态并提供相关证据。更新操作的代码示例请参见文件：

`test/transactions/04_approve_milestone_funding/06_update_milestone1.json`

### 5. 捐赠者审核并释放资金

以捐赠者身份登录，审核项目里程碑的进展并决定是否释放资金。审核交易的代码示例请参见文件：

`test/transactions/02_make_donation/08_approve_milestone_funding1.json`

### 6. 继续后续里程碑

重复步骤 4-5 完成后续里程碑，直到项目完成。

## 关键特性说明

- **里程碑资金释放**：每个里程碑完成后，需要捐赠者审核并批准才能释放资金
- **证据提交**：项目所有者需要提交证据哈希，证明里程碑已完成
- **自动状态更新**：所有里程碑完成并获得资金释放后，项目自动更新为完成状态

## 许可证

本项目采用 ISC 许可证。 
