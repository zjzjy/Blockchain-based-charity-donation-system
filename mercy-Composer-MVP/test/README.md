# Test Directory Structure

## 1. Participants
- Auditor
- Donor
- ProjectOwner

## 2. Assets
- Donation
- Project

## 3. Transactions (按执行顺序排列)
1. SetupDemo
2. MakeDonation
3. UpdateProjectStatus
4. ApproveMilestoneFunding
5. UpdateMilestone

## 目录结构
```test/
├── participants/
│   ├── auditor/
│   ├── donor/
│   └── project_owner/
├── assets/
│   ├── donation/
│   └── project/
└── transactions/
    ├── setup/
    ├── donations/
    ├── project_status/
    ├── milestones/
    └── project_status/
```

## 测试执行顺序说明
1. 首先测试参与者（Participants）相关的功能
2. 然后测试资产（Assets）相关的功能
3. 最后按照以下顺序测试交易（Transactions）：
   - 设置演示环境（SetupDemo）
   - 进行捐赠（MakeDonation）
   - 更新项目状态（UpdateProjectStatus）
   - 批准里程碑资金（ApproveMilestoneFunding）
   - 更新里程碑（UpdateMilestone）

# 慈善捐赠系统测试指南

## 测试角色说明

### 系统角色
1. NetworkAdmin
   - 系统管理员
   - 具有最高权限
   - 用于系统初始化和参与者管理

### 业务角色
1. 项目所有者
   - OWNER001: 医疗援助项目(PROJECT001)的所有者
   - OWNER002: 教育援助项目(PROJECT002)的所有者

2. 捐赠者
   - DONOR001: 医疗援助项目的捐赠者
   - DONOR002: 医疗援助项目的捐赠者
   - DONOR003: 教育援助项目的捐赠者

## 测试执行顺序

### 1. 系统初始化测试
1. 执行 `transactions/participants/create_participants.json`
   - 执行者: NetworkAdmin
   - 目的: 创建初始参与者（DONOR001-003, OWNER001-002）
   - 预期结果: 所有参与者创建成功

### 2. 项目创建测试
1. 执行 `transactions/projects/01_create_project1.json`
   - 执行者: OWNER001
   - 目的: 创建医疗援助项目(PROJECT001)
   - 预期结果: 项目创建成功，OWNER001成为项目所有者

2. 执行 `transactions/projects/02_create_project2.json`
   - 执行者: OWNER002
   - 目的: 创建教育援助项目(PROJECT002)
   - 预期结果: 项目创建成功，OWNER002成为项目所有者

### 3. 捐赠测试
1. 执行 `transactions/donations/03_make_donation1.json`
   - 执行者: DONOR001
   - 目的: 向PROJECT001捐赠5000
   - 预期结果: 捐赠记录创建成功

2. 执行 `transactions/donations/04_make_donation2.json`
   - 执行者: DONOR002
   - 目的: 向PROJECT001捐赠3000
   - 预期结果: 捐赠记录创建成功

3. 执行 `transactions/donations/05_make_donation3.json`
   - 执行者: DONOR003
   - 目的: 向PROJECT002捐赠1000
   - 预期结果: 捐赠记录创建成功

### 4. 里程碑更新测试
1. 执行 `transactions/milestones/06_update_milestone1.json`
   - 执行者: OWNER001
   - 目的: 更新PROJECT001的第一个里程碑
   - 预期结果: 里程碑状态更新成功

2. 执行 `transactions/milestones/07_update_milestone2.json`
   - 执行者: OWNER002
   - 目的: 更新PROJECT002的第一个里程碑
   - 预期结果: 里程碑状态更新成功

### 5. 资金审核测试
1. 执行 `transactions/donations/08_approve_milestone_funding1.json`
   - 执行者: DONOR001
   - 目的: 审核PROJECT001的里程碑资金
   - 预期结果: 资金审核成功，项目状态变为“in progress”

2. 执行 `transactions/donations/09_approve_milestone_funding2.json`
   - 执行者: DONOR003
   - 目的: 审核PROJECT002的里程碑资金
   - 预期结果: 资金审核成功，项目状态变为“in progress”

## 测试注意事项

1. 权限验证
   - 每个测试案例都应该验证相应角色的权限是否正确
   - 确保未授权的操作被正确拒绝
   - 特别注意不同所有者之间的权限隔离

2. 数据完整性
   - 检查每个操作后的数据状态是否正确
   - 验证关联数据（如项目状态、里程碑状态等）是否正确更新
   - 确保资金流向和状态变更符合预期

3. 错误处理
   - 测试无效操作是否返回适当的错误信息
   - 验证系统是否正确处理边界情况
   - 测试跨项目操作的权限控制

4. 测试环境
   - 确保测试环境干净，避免历史数据干扰
   - 建议在测试前重置系统状态
   - 注意区块链的不可修改性，确保测试数据的独立性

## 预期结果（已实现✅）

1. 项目所有者操作
   - 可以成功创建和管理自己的项目
   - 可以更新项目状态和里程碑
   - 无法操作其他所有者的项目
   - 不同所有者之间的项目完全隔离

2. 捐赠者操作
   - 可以查看所有项目
   - 可以进行捐赠
   - 可以审核里程碑资金
   - 无法修改项目信息
   - 可以查看自己的捐赠记录

3. 网络管理员操作
   - 可以管理所有参与者
   - 可以访问系统资源
   - 可以执行系统级操作 