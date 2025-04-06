# 测试数据说明文档

## 测试参与者说明

### 系统角色
NetworkAdmin
  - 角色：系统管理员
  - 权限级别：最高权限
  - 主要职责：
    - 系统初始化配置
    - 参与者账户管理
    - 系统参数设置

### 业务角色
#### 1. 审计员（Auditor）
- 角色：项目审批方
- 主要职责：
  - 项目合规性验证
  - 项目里程碑审核
  - 资金释放管理
  - 项目状态监控
  - 异常情况处理

#### 2. 项目所有者（ProjectOwner）
- 角色：项目发起人和管理者
- 主要职责：
  - 项目注册和管理
  - 项目里程碑更新
  - 项目团队管理
  - 项目进展报告

#### 3. 捐赠者（Donor）
- 角色：资金提供者
- 主要职责：
  - 捐赠者信息注册
  - 项目捐赠操作
  - 捐赠记录查询
  - 项目状态审批

## 测试执行流程

### 初始化阶段
1. NetworkAdmin 注册捐赠者
`1_RegisterDonor.json`: 注册新捐赠者（执行者: NetworkAdmin）
2. NetworkAdmin 注册审计员
`2_RegisterAuditor.json`: 注册审计员（执行者: NetworkAdmin）
3. NetworkAdmin 注册项目所有者
`3_RegisterProjectOwner.json`: 注册项目所有者（执行者: NetworkAdmin）
4. ProjectOwner 注册新项目
`4_RegisterProject.json`: 注册新项目（执行者: ProjectOwner）
5. Auditor 验证项目合规性
`5_VerifyProjectCompliance.json`: 验证项目合规性（执行者: Auditor）

### 捐赠阶段
6. Donor 进行捐赠募集操作
`6_MakeDonation.json`: 进行捐赠操作（执行者: Donor）
- 支持分批捐赠资金
- 资金要求：达到项目总额50%方可进入下一阶段（以项目处于注册状态为例）
- 资金状态：处于锁定状态（在donor账户中）
- 资金记录：通过 allocatedAmount 字段记录意向捐赠金额
- 资金释放：需等待项目审批通过后释放

7. Auditor 更新项目状态
`7_UpdateProjectStatus.json`: 更新项目状态（执行者: Auditor）
8. Donor 审批项目状态更新
`8_ApproveProjectStatusUpdate.json`: 批准项目状态更新（执行者: Donor）
9. Auditor 释放项目资金
`9_ReleaseFunds.json`: 释放项目资金（执行者: Auditor）
- 审批通过后释放资金
- 更新 FundingMilestone 记录

### 项目进展阶段
10. ProjectOwner 更新项目里程碑
`10_UpdateMilestone.json`: 更新项目里程碑（执行者: ProjectOwner）
11. Auditor 验证里程碑完成情况
`11_VerifyMilestone.json`: 验证里程碑完成情况（执行者: Auditor）

后续操作重复6-11操作，直至项目处于完成状态

### 项目管理阶段（验证不通过时）
- Auditor 冻结项目
`FreezeProject.json`: 冻结项目（执行者: Auditor）
- Auditor 解冻项目
`UnfreezeProject.json`: 解冻项目（执行者: Auditor）
- Auditor 更新捐赠者状态
`UpdateDonorStatus.json`: 更新捐赠者状态（执行者: Auditor）


## 测试数据说明

### 资产数据
- `Assets/Project.json`: 项目资产数据
- `Assets/Donation.json`: 捐赠资产数据

### 参与者数据
- `Participations/Auditor.json`: 审计员数据
- `Participations/ProjectOwner.json`: 项目所有者数据
- `Participations/Donor.json`: 捐赠者数据

### 交易数据
- `Transaction/*.json`: 各类交易数据

## 测试注意事项

1. 测试执行顺序
   - 确保前置条件满足
   - 验证数据状态正确

2. 数据完整性
   - 确保所有必要字段完整
   - 验证数据格式正确
   - 检查关联关系有效

3. 异常处理
   - 记录异常情况
   - 验证错误处理机制
   - 确保系统稳定性

## 测试前环境检查
- Node.js 环境 ✅
- Hyperledger Composer 环境 ✅
- 区块链网络环境 ✅
- 测试数据库环境 ✅