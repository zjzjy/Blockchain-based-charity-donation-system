# 慈善捐赠系统（基于Hyperledger Composer）

这是一个基于Hyperledger Composer的慈善捐赠管理系统，用于管理捐赠者、项目和捐赠交易的全生命周期。项目通过区块链技术确保透明度和不可篡改性，让捐赠活动更加可信。

## 项目结构

```
mercy-Composer/
├── models/              # 数据模型定义
│   └── charity.cto      # 业务网络定义文件
├── lib/                 # 交易处理函数
│   ├── donorTransaction.js      # 捐赠者相关交易
│   ├── donationTransaction.js   # 捐赠相关交易
│   └── projectTransaction.js    # 项目相关交易
├── permissions/         # 访问控制规则
│   └── permissions.acl  # 访问控制列表
└── package.json         # 项目配置文件
```

## 业务网络模型

该系统包含以下主要组件：

1. **参与者（Participants）**
   - 捐赠者（Donor）：进行捐赠的个人或组织
   - 项目所有者（ProjectOwner）：管理慈善项目
   - 管理员（Admin）：系统管理员
   - 审计员（Auditor）：负责合规检查和审计

2. **资产（Assets）**
   - 项目（Project）：慈善项目，包含资金目标、里程碑等
   - 捐赠（Donation）：捐赠记录，连接捐赠者和项目

3. **交易（Transactions）**
   - 捐赠（MakeDonation）：进行捐赠
   - 更新项目状态（UpdateProjectStatus）：更新项目生命周期
   - 更新KYC状态（UpdateKYCStatus）：更新捐赠者的KYC验证状态
   - 更新里程碑（UpdateMilestone）：跟踪项目进度

## 安装与部署

### 前提条件

1. 安装 Hyperledger Composer 开发环境
   ```bash
   npm install -g composer-cli@0.20
   npm install -g composer-rest-server@0.20
   npm install -g generator-hyperledger-composer@0.20
   npm install -g composer-playground@0.20
   ```

2. 安装 Hyperledger Fabric 运行时环境
   ```bash
   mkdir ~/fabric-dev-servers && cd ~/fabric-dev-servers
   curl -O https://raw.githubusercontent.com/hyperledger/composer-tools/master/packages/fabric-dev-servers/fabric-dev-servers.tar.gz
   tar -xvf fabric-dev-servers.tar.gz
   ```

### 启动 Fabric 网络

```bash
cd ~/fabric-dev-servers
export FABRIC_VERSION=hlfv12
./startFabric.sh
./createPeerAdminCard.sh
```

### 部署业务网络

1. 克隆项目
   ```bash
   git clone https://github.com/zjzjy/Blockchain-based-charity-donation-system.git
   cd mercy-Composer
   ```

2. 安装依赖
   ```bash
   npm install
   ```

3. 创建业务网络归档文件
   ```bash
   composer archive create -t dir -n .
   ```

4. 安装业务网络
   ```bash
   composer network install --card PeerAdmin@hlfv1 --archiveFile mercy-charity@0.0.1.bna
   ```

5. 启动业务网络
   ```bash
   composer network start --networkName mercy-charity --networkVersion 0.0.1 --networkAdmin admin --networkAdminEnrollSecret adminpw --card PeerAdmin@hlfv1 --file networkadmin.card
   ```

6. 导入网络管理员卡片
   ```bash
   composer card import --file networkadmin.card
   ```

### 启动 Composer Playground

```bash
composer-playground
```

现在可以通过浏览器访问 http://localhost:8080 来访问 Composer Playground。

### 部署 REST API 服务器

```bash
composer-rest-server -c admin@mercy-charity -n never -u true -w true
```

REST API 服务器将在 http://localhost:3000 上启动。

## 使用指南

1. **创建参与者**
   - 创建捐赠者
   - 创建项目所有者
   - 创建管理员和审计员

2. **创建项目**
   - 定义项目基本信息
   - 设置里程碑和目标

3. **进行捐赠**
   - 捐赠者完成KYC验证
   - 选择项目并捐赠

4. **跟踪项目进度**
   - 项目所有者更新里程碑
   - 管理员和审计员监督进展

## 许可证

本项目采用 ISC 许可证。 