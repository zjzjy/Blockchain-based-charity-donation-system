# 基于 Hyperledger Composer 的慈善捐赠管理系统

## 项目简介

这是一个基于 Hyperledger Composer 区块链平台的慈善捐赠管理系统。该系统旨在提供一个透明、可追溯、安全的慈善捐赠平台，通过区块链技术确保捐赠过程的公开透明和资金使用的可追溯性。

## 项目执行流程

# 项目执行流程

```mermaid
    A[注册项目] --> B[审批项目合规]
    B --> C[捐款满50%]
    C --> D[审批项目启动]
    D --> E[项目更新里程碑]
    E --> F[审批里程碑完成]
    F --> G[更新项目状态]
    G --> H[发放30%资金]
    H --> I[捐款满80%]
    I --> J[项目更新里程碑]
    J --> K[审批里程碑完成]
    K --> L[更新项目状态]
    L --> M[发放30%资金]
    M --> N[捐款满100%]
    N --> O[项目更新里程碑]
    O --> P[审批里程碑完成]
    P --> Q[发放20%资金]
    Q --> R[更新项目状态]
    R --> S[项目更新里程碑]
    S --> T[审批里程碑完成]
    T --> U[更新项目状态]
    U --> V[项目完成]
```

## 系统架构

### 参与者（Participants）

1. **捐赠者（Donor）**
   - 注册捐赠者信息
   - 进行捐赠
   - 查看捐赠记录
   - 参与项目状态审批

2. **项目所有者（ProjectOwner）**
   - 注册和管理项目
   - 更新项目里程碑
   - 管理项目团队

3. **审计员（Auditor）**
   - 验证项目合规性
   - 审核项目里程碑
   - 管理资金释放
   - 冻结/解冻项目

### 资产（Assets）

1. **项目（Project）**
   - 项目基本信息
   - 资金需求
   - 里程碑计划
   - 资金里程碑
   - 团队信息
   - 合规状态

2. **捐赠（Donation）**
   - 捐赠金额
   - 捐赠时间
   - 捐赠状态
   - 关联项目

### 交易（Transactions）

1. **捐赠者相关**
   - `RegisterDonor`: 注册新捐赠者
   - `UpdateDonorStatus`: 更新捐赠者状态
   - `MakeDonation`: 进行捐赠

2. **项目相关**
   - `RegisterProject`: 注册新项目
   - `UpdateProjectStatus`: 更新项目状态
   - `ApproveProjectStatusUpdate`: 批准项目状态更新
   - `UpdateMilestone`: 更新项目里程碑
   - `VerifyMilestone`: 验证里程碑完成情况

3. **审计相关**
   - `VerifyProjectCompliance`: 验证项目合规性
   - `ReleaseFunds`: 释放项目资金
   - `FreezeProject`: 冻结项目
   - `UnfreezeProject`: 解冻项目

## 项目状态流转

项目状态包括：
- `REGISTERED`: 已注册
- `LAUNCHED`: 已启动
- `IN_PROGRESS`: 进行中
- `NEAR_COMPLETE`: 接近完成
- `COMPLETED`: 已完成
- `PAUSED`: 已暂停
- `FROZEN`: 项目冻结
- `CANCELLED`: 已取消

## 目录结构

```
charity-donation/
├── README.md                 # 项目说明文档
├── package.json             # 项目依赖配置
├── composer.json            # Hyperledger Composer 配置文件
├── .bna                     # 业务网络归档文件
├── lib/                     # 业务逻辑实现
│   ├── models/             # 数据模型定义
│   │   ├── org.mercy.donation.cto  # 核心数据模型
│   │   └── permissions.acl         # 访问控制列表
│   └── logic.js            # 业务逻辑实现
└── test/                    # 测试数据目录
    ├── Assets/             # 资产测试数据
    │   ├── Project.json    # 项目资产数据
    │   └── Donation.json   # 捐赠资产数据
    ├── Participations/     # 参与者测试数据
    │   ├── Auditor.json    # 审计员数据
    │   ├── ProjectOwner.json # 项目所有者数据
    │   └── Donor.json      # 捐赠者数据
    └── Transaction/        # 交易测试数据
```

## 测试数据说明

项目包含完整的测试数据，位于 `test` 目录下：
- `Assets/`: 包含项目和捐赠的测试数据
- `Participations/`: 包含捐赠者、项目所有者和审计员的测试数据
- `Transaction/`: 包含各类交易的测试数据

## 许可证

本项目采用 MIT 许可证。详见 LICENSE 文件。

## 联系方式

如有任何问题或建议，请通过以下方式联系我们：
- 邮件：223040137@link.cuhk.edu.cn