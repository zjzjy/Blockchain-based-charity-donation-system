/**
 * projectContract.js - 慈善项目管理智能合约
 * 
 * 功能描述: 管理慈善平台上所有项目的创建、更新、查询和资金分配。
 * 这个合约是整个慈善系统的核心组件之一，负责项目的全生命周期管理，
 * 包括里程碑跟踪、资金状态维护、合规审计等功能。
 * 
 * 主要功能:
 * 1. 项目的创建与基本信息管理
 * 2. 项目里程碑的设置与跟踪
 * 3. 项目资金状态的维护与更新
 * 4. 项目合规状态的管理
 * 5. 项目相关人员(团队成员、合作伙伴)的管理
 * 6. 项目所有者的管理与认证
 * 
 * 作者: Junyin
 * 版本: 1.0
 */
'use strict';

// 导入Fabric合约API库，用于创建智能合约
const { Contract } = require('fabric-contract-api');

/**
 * 项目合约类 - 处理所有与慈善项目相关的交易
 * 
 * 这个类继承自Fabric的Contract基类，实现了项目管理的所有业务逻辑。
 * 通过这个合约，平台可以管理项目从创建到完成的整个生命周期，
 * 并确保资金分配的透明度和可追溯性。
 */
class ProjectContract extends Contract {
    /**
     * 构造函数 - 初始化合约并设置命名空间
     * 
     * @description 
     * 设置合约命名空间为'org.mercy.charity.project'，用于在通道上
     * 唯一标识该合约，并将其与其他合约区分开来。
     */
    constructor() {
        // 调用父类构造函数并设置合约命名空间
        super('org.mercy.charity.project');
    }

    /**
     * 创建新项目
     * 
     * @description
     * 在区块链上创建新的慈善项目记录，包含项目基本信息、资金需求、
     * 所有者信息等。新创建的项目默认处于"已注册"状态，需要后续审核。
     * 
     * @param {Context} ctx - 交易上下文对象，提供区块链交互的API
     * @param {String} projectId - 项目唯一标识符
     * @param {String} name - 项目名称
     * @param {String} description - 项目详细描述
     * @param {String} startDate - 项目开始日期，格式为YYYY-MM-DD
     * @param {String} endDate - 项目结束日期，格式为YYYY-MM-DD
     * @param {String} categories - 项目类别，JSON字符串格式的数组
     * @param {String} totalFundingRequired - 项目所需总资金，数字字符串
     * @param {String} projectOwnerId - 项目所有者ID，关联到项目所有者记录
     * 
     * @returns {String} 新创建的项目信息的JSON字符串表示
     * @throws {Error} 如果项目创建过程中发生错误，例如项目所有者不存在或数据验证失败
     */
    async createProject(ctx, projectId, name, description, startDate, endDate, categories, totalFundingRequired, projectOwnerId) {
        try {
            // 1. 验证项目所有者是否存在
            // 通过调用辅助方法检查项目所有者是否已注册并通过验证
            const projectOwnerExists = await this.projectOwnerExists(ctx, projectOwnerId);
            if (!projectOwnerExists) {
                throw new Error('项目所有者未注册或未通过验证');
            }

            // 2. 创建项目对象
            // 构建包含所有必要字段的项目数据结构
            const project = {
                projectId: projectId,                      // 项目唯一标识符
                name: name,                                // 项目名称
                description: description,                  // 项目详细描述
                startDate: startDate,                      // 项目开始日期
                endDate: endDate,                          // 项目结束日期
                categories: JSON.parse(categories),        // 项目类别数组
                totalFundingRequired: parseFloat(totalFundingRequired), // 所需总资金
                allocatedFunding: 0,                       // 已分配资金，初始为0
                owner: projectOwnerId,                     // 项目所有者ID
                projectStatus: 'REGISTERED',               // 项目状态，初始为已注册
                fundingStatus: 'PENDING',                  // 资金状态，初始为待处理
                complianceStatus: 'UNVERIFIED',            // 合规状态，初始为未验证
                createdAt: new Date().toISOString(),       // 创建时间
                updatedAt: new Date().toISOString(),       // 最后更新时间
                milestones: [],                            // 里程碑列表，初始为空
                teamMembers: [],                           // 团队成员列表，初始为空
                partners: [],                              // 合作伙伴列表，初始为空
                auditReportHash: '',                       // 审计报告哈希，初始为空
                registrationNumber: `REG-${projectId}`     // 注册编号
            };

            // 3. 验证项目数据
            // 通过辅助方法验证项目数据的有效性和完整性
            await this.validateProject(project);

            // 4. 存储项目信息
            // 将项目数据保存到区块链状态数据库
            await ctx.stub.putState(projectId, Buffer.from(JSON.stringify(project)));

            // 5. 更新项目所有者的项目列表
            // 通过辅助方法将新项目关联到项目所有者
            await this.updateProjectOwnerProjects(ctx, projectOwnerId, projectId);

            // 6. 记录创建事件
            // 通过辅助方法发送项目创建事件，便于外部系统监控和响应
            await this.emitEvent(ctx, 'ProjectCreated', {
                projectId: projectId,
                owner: projectOwnerId,
                timestamp: new Date().toISOString()
            });

            // 返回新创建的项目信息
            return JSON.stringify(project);
        } catch (error) {
            // 错误处理：包装错误信息并重新抛出
            throw new Error(`创建项目失败: ${error.message}`);
        }
    }

    /**
     * 更新项目信息
     * 
     * @description
     * 更新区块链上现有项目的信息。只有项目所有者才能执行此操作，
     * 更新的数据必须通过验证，并且会记录更新时间和触发事件通知。
     * 
     * @param {Context} ctx - 交易上下文对象
     * @param {String} projectId - 要更新的项目ID
     * @param {Object} updates - 包含要更新的字段和值的对象
     * 
     * @returns {Object} 更新后的项目对象
     * @throws {Error} 如果项目不存在、用户无权限或数据验证失败
     */
    async updateProject(ctx, projectId, updates) {
        try {
            // 1. 获取项目信息
            // 从区块链状态数据库中读取项目数据
            const projectBytes = await ctx.stub.getState(projectId);
            if (!projectBytes || projectBytes.length === 0) {
                throw new Error('项目不存在');
            }

            // 2. 获取当前用户ID
            // 从客户端证书中获取项目所有者ID属性
            const projectOwnerId = ctx.clientIdentity.getAttributeValue('projectOwnerId');
            
            // 3. 验证项目所有权
            // 确保只有项目所有者才能更新项目
            const project = JSON.parse(projectBytes.toString());
            if (project.owner !== projectOwnerId) {
                throw new Error('只有项目所有者可以更新项目');
            }

            // 4. 更新项目信息
            // 使用Object.assign将更新的字段合并到现有项目对象中
            Object.assign(project, updates);
            project.updatedAt = new Date().toISOString(); // 更新时间戳

            // 5. 验证更新后的数据
            // 确保更新后的项目数据仍然符合业务规则
            await this.validateProject(project);

            // 6. 存储更新后的项目信息
            // 将更新后的数据保存回区块链
            await ctx.stub.putState(projectId, Buffer.from(JSON.stringify(project)));

            // 7. 记录更新事件
            // 发送事件通知，供外部系统跟踪项目变更
            await this.emitEvent(ctx, 'ProjectUpdated', {
                projectId: projectId,
                owner: projectOwnerId,
                timestamp: new Date().toISOString()
            });

            return project; // 返回更新后的项目对象
        } catch (error) {
            // 错误处理：包装错误信息并重新抛出
            throw new Error(`更新项目失败: ${error.message}`);
        }
    }

    /**
     * 获取项目详情
     * 
     * @description
     * 根据项目ID获取项目的详细信息。这是一个只读操作，任何人都可以查询公开的项目信息。
     * 
     * @param {Context} ctx - 交易上下文对象
     * @param {String} projectId - 要查询的项目ID
     * 
     * @returns {Object} 项目详情对象
     * @throws {Error} 如果项目不存在
     */
    async getProject(ctx, projectId) {
        try {
            // 从区块链状态数据库中读取项目数据
            const projectBytes = await ctx.stub.getState(projectId);
            // 如果项目不存在，抛出错误
            if (!projectBytes || projectBytes.length === 0) {
                throw new Error('项目不存在');
            }
            // 解析并返回项目对象
            return JSON.parse(projectBytes.toString());
        } catch (error) {
            // 错误处理：包装错误信息并重新抛出
            throw new Error(`获取项目失败: ${error.message}`);
        }
    }

    /**
     * 获取所有项目列表
     * 
     * @description
     * 检索区块链上注册的所有项目。这个方法返回完整的项目列表，
     * 可用于仪表板展示或项目浏览功能。
     * 
     * @param {Context} ctx - 交易上下文对象
     * 
     * @returns {String} 包含所有项目信息的JSON字符串
     * @throws {Error} 如果查询过程中发生错误
     */
    async getAllProjects(ctx) {
        try {
            // 定义键范围查询的起止键
            const startKey = '';  // 空字符串表示范围的开始
            const endKey = '';    // 空字符串表示范围的结束
            const results = [];   // 存储查询结果的数组

            // 使用范围查询获取所有项目
            // 通过异步迭代器逐个处理返回的键值对
            for await (const {key, value} of ctx.stub.getStateByRange(startKey, endKey)) {
                const strValue = Buffer.from(value).toString('utf8');
                let record;
                try {
                    // 尝试将值解析为JSON对象
                    record = JSON.parse(strValue);
                } catch (err) {
                    // 如果解析失败，使用原始字符串
                    console.log(err);
                    record = strValue;
                }
                // 将项目添加到结果数组，包含键和记录对象
                results.push({ Key: key, Record: record });
            }
            // 将结果数组转换为JSON字符串并返回
            return JSON.stringify(results);
        } catch (error) {
            // 错误处理：包装错误信息并重新抛出
            throw new Error(`获取所有项目失败: ${error.message}`);
        }
    }

    /**
     * 辅助方法：检查项目所有者是否存在
     * 
     * @description
     * 验证指定的项目所有者是否已在系统中注册。
     * 该方法通过查询项目所有者的键来确认其存在性。
     * 
     * @param {Context} ctx - 交易上下文对象
     * @param {String} projectOwnerId - 要验证的项目所有者ID
     * 
     * @returns {Boolean} 如果项目所有者存在则返回true，否则返回false
     */
    async projectOwnerExists(ctx, projectOwnerId) {
        // 构建项目所有者在状态数据库中的键
        const projectOwnerKey = `PROJECTOWNER_${projectOwnerId}`;
        // 尝试获取项目所有者数据
        const projectOwnerBytes = await ctx.stub.getState(projectOwnerKey);
        // 如果返回的数据非空，则项目所有者存在
        return projectOwnerBytes && projectOwnerBytes.length > 0;
    }

    /**
     * 辅助方法：验证项目数据
     * 
     * @description
     * 验证项目数据的完整性和有效性，确保必填字段存在且符合业务规则。
     * 如果验证失败，将抛出描述性错误。
     * 
     * @param {Object} project - 要验证的项目对象
     * 
     * @throws {Error} 如果验证失败，抛出详细的错误信息
     */
    async validateProject(project) {
        // 验证必填字段
        if (!project.projectId || !project.name || !project.description) {
            throw new Error('项目ID、名称和描述为必填项');
        }
        // 验证资金金额必须为正数
        if (project.totalFundingRequired <= 0) {
            throw new Error('项目所需资金必须大于0');
        }
        // 验证日期逻辑，确保结束日期晚于开始日期
        if (new Date(project.startDate) >= new Date(project.endDate)) {
            throw new Error('项目结束日期必须晚于开始日期');
        }
        // 可以添加更多验证规则，例如类别验证、字符串长度限制等
    }

    /**
     * 辅助方法：更新项目所有者的项目列表
     * 
     * @description
     * 当创建新项目时，将项目ID添加到项目所有者的项目列表中，
     * 维护项目与所有者之间的双向关联关系。
     * 
     * @param {Context} ctx - 交易上下文对象
     * @param {String} projectOwnerId - 项目所有者ID
     * @param {String} projectId - 要添加到所有者列表的项目ID
     */
    async updateProjectOwnerProjects(ctx, projectOwnerId, projectId) {
        // 构建项目所有者在状态数据库中的键
        const projectOwnerKey = `PROJECTOWNER_${projectOwnerId}`;
        // 获取项目所有者数据
        const projectOwnerBytes = await ctx.stub.getState(projectOwnerKey);
        
        // 如果项目所有者存在，更新其项目列表
        if (projectOwnerBytes && projectOwnerBytes.length > 0) {
            // 解析项目所有者数据
            const projectOwner = JSON.parse(projectOwnerBytes.toString());
            // 如果项目ID列表不存在，初始化为空数组
            if (!projectOwner.projectIds) {
                projectOwner.projectIds = [];
            }
            // 如果项目ID尚未在列表中，添加它
            if (!projectOwner.projectIds.includes(projectId)) {
                projectOwner.projectIds.push(projectId);
                // 将更新后的项目所有者数据保存回区块链
                await ctx.stub.putState(projectOwnerKey, Buffer.from(JSON.stringify(projectOwner)));
            }
        }
        // 如果项目所有者不存在，此方法不做任何操作
        // 这种情况应该不会发生，因为创建项目前会检查所有者存在性
    }

    /**
     * 辅助方法：发送事件
     * 
     * @description
     * 向区块链网络发送事件通知，外部应用可以监听这些事件
     * 以便实时获取链上发生的重要操作。
     * 
     * @param {Context} ctx - 交易上下文对象
     * @param {String} eventName - 事件名称
     * @param {Object} payload - 事件载荷，包含相关数据
     */
    async emitEvent(ctx, eventName, payload) {
        // 构建事件对象，包含事件名称和载荷
        const event = {
            eventName: eventName,
            payload: payload
        };
        // 使用Fabric API发送事件
        await ctx.stub.setEvent(eventName, Buffer.from(JSON.stringify(event)));
    }

    /**
     * 添加项目里程碑
     * 
     * @description
     * 向现有项目添加新的里程碑，里程碑用于跟踪项目进度和资金使用情况。
     * 每个里程碑包含描述、期限、所需资金等信息。
     * 
     * @param {Context} ctx - 交易上下文对象
     * @param {String} projectId - 要添加里程碑的项目ID
     * @param {String} milestoneId - 里程碑唯一标识符
     * @param {String} description - 里程碑描述
     * @param {String} deadline - 里程碑截止日期
     * @param {String} fundingAmount - 里程碑所需资金金额
     * 
     * @returns {String} 更新后的项目信息的JSON字符串
     * @throws {Error} 如果项目不存在
     */
    async addMilestone(ctx, projectId, milestoneId, description, deadline, fundingAmount) {
        // 验证项目是否存在
        const projectBytes = await ctx.stub.getState(projectId);
        if (!projectBytes || projectBytes.length === 0) {
            throw new Error(`项目 ${projectId} 不存在`);
        }

        // 解析项目数据
        const project = JSON.parse(projectBytes.toString());
        
        // 创建新的里程碑对象
        const milestone = {
            milestoneId,                      // 里程碑唯一标识符
            description,                      // 里程碑描述
            deadline,                         // 截止日期
            fundingAmount: parseFloat(fundingAmount), // 所需资金金额
            isCompleted: false,               // 完成状态，初始为未完成
            completionDate: null              // 完成日期，初始为空
        };

        // 将新里程碑添加到项目的里程碑数组中
        project.milestones.push(milestone);
        
        // 将更新后的项目数据保存回区块链
        await ctx.stub.putState(projectId, Buffer.from(JSON.stringify(project)));
        
        // 返回更新后的项目信息
        return JSON.stringify(project);
    }

    /**
     * 更新里程碑状态
     * 
     * @description
     * 更新项目里程碑的完成状态。如果将状态设置为已完成，
     * 系统会自动记录完成日期。
     * 
     * @param {Context} ctx - 交易上下文对象
     * @param {String} projectId - 项目ID
     * @param {String} milestoneId - 里程碑ID
     * @param {Boolean} isCompleted - 是否已完成
     * 
     * @returns {String} 更新后的项目信息的JSON字符串
     * @throws {Error} 如果项目或里程碑不存在
     */
    async updateMilestoneStatus(ctx, projectId, milestoneId, isCompleted) {
        // 验证项目是否存在
        const projectBytes = await ctx.stub.getState(projectId);
        if (!projectBytes || projectBytes.length === 0) {
            throw new Error(`项目 ${projectId} 不存在`);
        }

        // 解析项目数据
        const project = JSON.parse(projectBytes.toString());
        
        // 查找特定的里程碑
        const milestone = project.milestones.find(m => m.milestoneId === milestoneId);
        if (!milestone) {
            throw new Error(`里程碑 ${milestoneId} 不存在`);
        }

        // 更新里程碑的完成状态
        milestone.isCompleted = isCompleted;
        
        // 如果设置为已完成，记录完成日期
        if (isCompleted) {
            milestone.completionDate = new Date().toISOString();
        }

        // 将更新后的项目数据保存回区块链
        await ctx.stub.putState(projectId, Buffer.from(JSON.stringify(project)));
        
        // 返回更新后的项目信息
        return JSON.stringify(project);
    }

    /**
     * 更新里程碑详细信息
     * 
     * @description
     * 更全面的里程碑更新方法，可以更新里程碑的完成状态和完成日期。
     * 此方法还会根据里程碑完成情况自动更新项目的整体状态，
     * 并发送事件通知。
     * 
     * @param {Context} ctx - 交易上下文对象
     * @param {String} projectId - 项目ID
     * @param {String} milestoneId - 里程碑ID
     * @param {String} isCompleted - 完成状态('true'或'false')
     * @param {String} completionDate - 完成日期(可选)
     * 
     * @returns {String} 更新后的项目信息的JSON字符串
     * @throws {Error} 如果项目或里程碑不存在，或更新过程中发生错误
     */
    async updateMilestone(ctx, projectId, milestoneId, isCompleted, completionDate) {
        try {
            // 验证项目是否存在
            const projectBytes = await ctx.stub.getState(projectId);
            if (!projectBytes || projectBytes.length === 0) {
                throw new Error(`项目 ${projectId} 不存在`);
            }

            // 解析项目数据
            const project = JSON.parse(projectBytes.toString());
            
            // 查找特定里程碑的索引
            const milestoneIndex = project.milestones.findIndex(m => m.milestoneId === milestoneId);
            
            // 如果里程碑不存在，抛出错误
            if (milestoneIndex === -1) {
                throw new Error(`里程碑 ${milestoneId} 不存在`);
            }

            // 获取要更新的里程碑
            const milestone = project.milestones[milestoneIndex];
            
            // 更新里程碑状态
            // 将字符串'true'/'false'转换为布尔值
            milestone.isCompleted = isCompleted === 'true';
            
            // 设置完成日期：如果提供了日期并且里程碑已完成，使用提供的日期；
            // 如果没提供日期但里程碑已完成，使用当前日期；
            // 如果里程碑未完成，完成日期保持为null
            if (milestone.isCompleted && completionDate) {
                milestone.completionDate = completionDate;
            } else if (milestone.isCompleted) {
                milestone.completionDate = new Date().toISOString();
            }

            // 更新项目中的里程碑
            project.milestones[milestoneIndex] = milestone;
            
            // 检查项目进度状态：根据已完成的里程碑比例更新项目整体状态
            const completedMilestones = project.milestones.filter(m => m.isCompleted).length;
            const totalMilestones = project.milestones.length;
            
            if (totalMilestones > 0) {
                // 计算完成百分比
                const completionPercentage = (completedMilestones / totalMilestones) * 100;
                
                // 根据完成百分比设置项目状态
                if (completionPercentage === 100) {
                    project.projectStatus = 'COMPLETED';     // 全部完成
                } else if (completionPercentage >= 80) {
                    project.projectStatus = 'NEAR_COMPLETION'; // 接近完成(80%以上)
                } else if (completionPercentage > 0) {
                    project.projectStatus = 'IN_PROGRESS';   // 进行中(大于0%)
                }
            }

            // 发出里程碑更新事件，通知其他系统组件
            const milestoneEvent = {
                projectId: projectId,                   // 项目ID
                milestoneId: milestoneId,               // 里程碑ID
                isCompleted: milestone.isCompleted,     // 完成状态
                completionDate: milestone.completionDate, // 完成日期
                updatedBy: ctx.clientIdentity.getID()   // 更新者身份
            };
            await this.emitEvent(ctx, 'MilestoneUpdated', milestoneEvent);

            // 保存更新后的项目数据到区块链
            await ctx.stub.putState(projectId, Buffer.from(JSON.stringify(project)));
            
            // 返回更新后的项目信息
            return JSON.stringify(project);
        } catch (error) {
            // 错误处理：包装错误信息并重新抛出
            throw new Error(`更新里程碑失败: ${error.message}`);
        }
    }

    /**
     * 更新项目状态
     * 
     * @description
     * 更新项目的生命周期状态，如"已注册"、"进行中"、"已完成"等。
     * 项目状态反映了项目当前所处的阶段。
     * 
     * @param {Context} ctx - 交易上下文对象
     * @param {String} projectId - 项目ID
     * @param {String} newStatus - 新的项目状态值
     * 
     * @returns {String} 更新后的项目信息的JSON字符串
     * @throws {Error} 如果项目不存在
     */
    async updateProjectStatus(ctx, projectId, newStatus) {
        // 验证项目是否存在
        const projectBytes = await ctx.stub.getState(projectId);
        if (!projectBytes || projectBytes.length === 0) {
            throw new Error(`项目 ${projectId} 不存在`);
        }

        // 解析项目数据
        const project = JSON.parse(projectBytes.toString());
        // 更新项目状态
        project.projectStatus = newStatus;
        // 更新项目的最后修改时间(可选)
        project.updatedAt = new Date().toISOString();
        
        // 将更新后的项目数据保存回区块链
        await ctx.stub.putState(projectId, Buffer.from(JSON.stringify(project)));
        
        // 返回更新后的项目信息
        return JSON.stringify(project);
    }

    /**
     * 更新项目资金状态
     * 
     * @description
     * 当项目收到新的捐赠时，更新项目的已分配资金金额和资金状态。
     * 此方法通常由捐赠合约在创建新捐赠时调用。
     * 
     * @param {Context} ctx - 交易上下文对象
     * @param {String} projectId - 项目ID
     * @param {Number|String} amount - 新增的资金金额
     * 
     * @returns {String} 更新后的项目信息的JSON字符串
     * @throws {Error} 如果项目不存在
     */
    async updateFundingStatus(ctx, projectId, amount) {
        // 验证项目是否存在
        const projectBytes = await ctx.stub.getState(projectId);
        if (!projectBytes || projectBytes.length === 0) {
            throw new Error(`项目 ${projectId} 不存在`);
        }

        // 解析项目数据
        const project = JSON.parse(projectBytes.toString());
        // 更新项目已分配资金，确保amount被转换为数字
        project.allocatedFunding += parseFloat(amount);

        // 更新资金状态
        // 如果已分配资金达到或超过所需资金，标记为"完全资助"
        if (project.allocatedFunding >= project.totalFundingRequired) {
            project.fundingStatus = 'FULLY_FUNDED';
        } 
        // 如果已分配资金大于0但未达到所需金额，标记为"部分资助"
        else if (project.allocatedFunding > 0) {
            project.fundingStatus = 'PARTIALLY_FUNDED';
        }
        // 更新项目的最后修改时间(可选)
        project.updatedAt = new Date().toISOString();

        // 将更新后的项目数据保存回区块链
        await ctx.stub.putState(projectId, Buffer.from(JSON.stringify(project)));
        
        // 返回更新后的项目信息
        return JSON.stringify(project);
    }

    /**
     * 更新项目合规状态
     * 
     * @description
     * 更新项目的合规审核状态，并可选择添加审计报告哈希值作为证明。
     * 合规状态通常由审计员或管理员在完成合规审查后更新。
     * 
     * @param {Context} ctx - 交易上下文对象
     * @param {String} projectId - 项目ID
     * @param {String} status - 新的合规状态值
     * @param {String} auditReportHash - 审计报告哈希值(可选)
     * 
     * @returns {String} 更新后的项目信息的JSON字符串
     * @throws {Error} 如果项目不存在
     */
    async updateComplianceStatus(ctx, projectId, status, auditReportHash) {
        // 验证项目是否存在
        const projectBytes = await ctx.stub.getState(projectId);
        if (!projectBytes || projectBytes.length === 0) {
            throw new Error(`项目 ${projectId} 不存在`);
        }

        // 解析项目数据
        const project = JSON.parse(projectBytes.toString());
        // 更新合规状态
        project.complianceStatus = status;
        // 如果提供了审计报告哈希，则更新它
        if (auditReportHash) {
            project.auditReportHash = auditReportHash;
        }
        // 更新项目的最后修改时间(可选)
        project.updatedAt = new Date().toISOString();
        
        // 将更新后的项目数据保存回区块链
        await ctx.stub.putState(projectId, Buffer.from(JSON.stringify(project)));
        
        // 返回更新后的项目信息
        return JSON.stringify(project);
    }

    /**
     * 查询项目信息
     * 
     * @description
     * 根据项目ID获取项目的详细信息。这是一个只读操作，
     * 返回JSON格式的项目数据。
     * 
     * @param {Context} ctx - 交易上下文对象
     * @param {String} projectId - 要查询的项目ID
     * 
     * @returns {String} 项目信息的JSON字符串
     * @throws {Error} 如果项目不存在
     */
    async queryProject(ctx, projectId) {
        // 从区块链状态数据库中获取项目数据
        const projectBytes = await ctx.stub.getState(projectId);
        // 验证项目是否存在
        if (!projectBytes || projectBytes.length === 0) {
            throw new Error(`项目 ${projectId} 不存在`);
        }
        // 直接返回项目数据的字符串表示
        return projectBytes.toString();
    }

    /**
     * 为里程碑分配资金
     * 
     * @description
     * 将资金分配给已完成的项目里程碑。此操作通常在里程碑完成验证后执行，
     * 用于释放相应的资金用于项目实施。
     * 
     * @param {Context} ctx - 交易上下文对象
     * @param {String} projectId - 项目ID
     * @param {String} milestoneId - 里程碑ID
     * @param {String} amount - 要分配的资金金额
     * 
     * @returns {String} 更新后的项目信息的JSON字符串
     * @throws {Error} 如果项目或里程碑不存在，或里程碑未完成
     */
    async allocateFundsToMilestone(ctx, projectId, milestoneId, amount) {
        try {
            // 验证项目是否存在
            const projectBytes = await ctx.stub.getState(projectId);
            if (!projectBytes || projectBytes.length === 0) {
                throw new Error(`项目 ${projectId} 不存在`);
            }

            // 解析项目数据
            const project = JSON.parse(projectBytes.toString());
            
            // 查找特定的里程碑
            const milestone = project.milestones.find(m => m.milestoneId === milestoneId);
            if (!milestone) {
                throw new Error(`里程碑 ${milestoneId} 不存在`);
            }

            // 检查里程碑是否已完成 - 未完成的里程碑不能分配资金
            if (!milestone.isCompleted) {
                throw new Error(`里程碑 ${milestoneId} 尚未完成，无法分配资金`);
            }

            // 更新项目已分配资金总额
            const fundingAmount = parseFloat(amount);
            project.allocatedFunding += fundingAmount;

            // 根据已分配资金总额更新项目资金状态
            if (project.allocatedFunding >= project.totalFundingRequired) {
                project.fundingStatus = 'FULLY_FUNDED';  // 完全资助
            } else if (project.allocatedFunding > 0) {
                project.fundingStatus = 'PARTIALLY_FUNDED';  // 部分资助
            }

            // 更新里程碑的资金分配信息
            milestone.fundingAllocatedDate = new Date().toISOString();  // 记录分配时间
            milestone.fundingAllocated = true;  // 标记为已分配资金

            // 发出资金分配事件，通知外部系统
            const allocationEvent = {
                projectId: projectId,             // 项目ID
                milestoneId: milestoneId,         // 里程碑ID
                amount: fundingAmount,            // 分配金额
                timestamp: milestone.fundingAllocatedDate,  // 分配时间
                allocatedBy: ctx.clientIdentity.getID()     // 操作者身份
            };
            await this.emitEvent(ctx, 'FundingAllocated', allocationEvent);

            // 保存更新后的项目数据到区块链
            await ctx.stub.putState(projectId, Buffer.from(JSON.stringify(project)));
            
            // 返回更新后的项目信息
            return JSON.stringify(project);
        } catch (error) {
            // 错误处理：包装错误信息并重新抛出
            throw new Error(`分配资金失败: ${error.message}`);
        }
    }

    /**
     * 添加团队成员
     * 
     * @description
     * 将新的团队成员添加到项目中。团队成员是参与项目实施的个人，
     * 包括项目经理、技术人员、财务人员等。
     * 
     * @param {Context} ctx - 交易上下文对象
     * @param {String} projectId - 项目ID
     * @param {String} memberId - 团队成员唯一标识符
     * @param {String} name - 团队成员姓名
     * @param {String} role - 团队成员在项目中的角色
     * @param {String} contactInfo - 团队成员联系信息
     * 
     * @returns {String} 更新后的项目信息的JSON字符串
     * @throws {Error} 如果项目不存在
     */
    async addTeamMember(ctx, projectId, memberId, name, role, contactInfo) {
        // 验证项目是否存在
        const projectBytes = await ctx.stub.getState(projectId);
        if (!projectBytes || projectBytes.length === 0) {
            throw new Error(`项目 ${projectId} 不存在`);
        }

        // 解析项目数据
        const project = JSON.parse(projectBytes.toString());
        
        // 创建团队成员对象
        const teamMember = {
            memberId,       // 成员唯一标识符
            name,           // 成员姓名
            role,           // 成员角色
            contactInfo     // 联系信息
        };

        // 将团队成员添加到项目的团队成员数组中
        project.teamMembers.push(teamMember);
        
        // 将更新后的项目数据保存回区块链
        await ctx.stub.putState(projectId, Buffer.from(JSON.stringify(project)));
        
        // 返回更新后的项目信息
        return JSON.stringify(project);
    }

    /**
     * 添加合作伙伴
     * 
     * @description
     * 将新的合作伙伴添加到项目中。合作伙伴可以是支持项目的组织、
     * 机构或企业，包括赞助商、技术提供方等。
     * 
     * @param {Context} ctx - 交易上下文对象
     * @param {String} projectId - 项目ID
     * @param {String} partnerId - 合作伙伴唯一标识符
     * @param {String} name - 合作伙伴名称
     * @param {String} type - 合作伙伴类型(如赞助商、技术提供方等)
     * @param {String} contactInfo - 合作伙伴联系信息
     * 
     * @returns {String} 更新后的项目信息的JSON字符串
     * @throws {Error} 如果项目不存在
     */
    async addPartner(ctx, projectId, partnerId, name, type, contactInfo) {
        // 验证项目是否存在
        const projectBytes = await ctx.stub.getState(projectId);
        if (!projectBytes || projectBytes.length === 0) {
            throw new Error(`项目 ${projectId} 不存在`);
        }

        // 解析项目数据
        const project = JSON.parse(projectBytes.toString());
        
        // 创建合作伙伴对象
        const partner = {
            partnerId,      // 合作伙伴唯一标识符
            name,           // 合作伙伴名称
            type,           // 合作伙伴类型
            contactInfo     // 联系信息
        };

        // 将合作伙伴添加到项目的合作伙伴数组中
        project.partners.push(partner);
        
        // 将更新后的项目数据保存回区块链
        await ctx.stub.putState(projectId, Buffer.from(JSON.stringify(project)));
        
        // 返回更新后的项目信息
        return JSON.stringify(project);
    }

    /**
     * 创建项目所有者
     * 
     * @description
     * 在区块链上创建新的项目所有者记录。项目所有者是可以创建和管理
     * 慈善项目的组织或个人，如慈善机构、非营利组织等。
     * 
     * @param {Context} ctx - 交易上下文对象
     * @param {String} projectOwnerId - 项目所有者唯一标识符
     * @param {String} name - 项目所有者名称
     * @param {String} email - 电子邮箱地址
     * @param {String} phone - 电话号码
     * @param {String} address - 实体地址
     * 
     * @returns {String} 新创建的项目所有者信息的JSON字符串
     * @throws {Error} 如果项目所有者已存在或创建过程中发生错误
     */
    async createProjectOwner(ctx, projectOwnerId, name, email, phone, address) {
        try {
            // 构建项目所有者的键
            const projectOwnerKey = `PROJECTOWNER_${projectOwnerId}`;
            
            // 检查项目所有者是否已存在
            const projectOwnerBytes = await ctx.stub.getState(projectOwnerKey);
            if (projectOwnerBytes && projectOwnerBytes.length > 0) {
                throw new Error(`项目所有者 ${projectOwnerId} 已存在`);
            }

            // 创建项目所有者对象，包含所有必要信息
            const projectOwner = {
                projectOwnerId: projectOwnerId,       // 唯一标识符
                name: name,                           // 名称
                email: email,                         // 电子邮箱
                phone: phone,                         // 电话号码
                address: address,                     // 地址
                isVerified: false,                    // 验证状态，初始为未验证
                projectIds: [],                       // 管理的项目ID列表，初始为空
                registrationDate: new Date().toISOString(), // 注册日期
                status: 'ACTIVE'                      // 状态，初始为激活
            };

            // 将项目所有者数据保存到区块链
            await ctx.stub.putState(projectOwnerKey, Buffer.from(JSON.stringify(projectOwner)));

            // 发出创建事件，通知外部系统
            await this.emitEvent(ctx, 'ProjectOwnerCreated', {
                projectOwnerId: projectOwnerId,
                timestamp: new Date().toISOString()
            });

            // 返回新创建的项目所有者信息
            return JSON.stringify(projectOwner);
        } catch (error) {
            // 错误处理：包装错误信息并重新抛出
            throw new Error(`创建项目所有者失败: ${error.message}`);
        }
    }

    /**
     * 查询项目所有者
     * 
     * @description
     * 根据项目所有者ID查询项目所有者的详细信息。
     * 这是一个只读操作，不修改区块链状态。
     * 
     * @param {Context} ctx - 交易上下文对象
     * @param {String} projectOwnerId - 项目所有者ID
     * 
     * @returns {String} 项目所有者信息的JSON字符串
     * @throws {Error} 如果项目所有者不存在
     */
    async queryProjectOwner(ctx, projectOwnerId) {
        try {
            // 构建项目所有者的键
            const projectOwnerKey = `PROJECTOWNER_${projectOwnerId}`;
            
            // 从区块链获取项目所有者数据
            const projectOwnerBytes = await ctx.stub.getState(projectOwnerKey);
            
            // 验证项目所有者是否存在
            if (!projectOwnerBytes || projectOwnerBytes.length === 0) {
                throw new Error(`项目所有者 ${projectOwnerId} 不存在`);
            }
            
            // 返回项目所有者信息
            return projectOwnerBytes.toString();
        } catch (error) {
            // 错误处理：包装错误信息并重新抛出
            throw new Error(`查询项目所有者失败: ${error.message}`);
        }
    }
    
    /**
     * 查询项目所有者的项目列表
     * 
     * @description
     * 获取特定项目所有者创建或管理的所有项目。此方法返回完整的
     * 项目对象列表，而不仅仅是项目ID。
     * 
     * @param {Context} ctx - 交易上下文对象
     * @param {String} projectOwnerId - 项目所有者ID
     * 
     * @returns {String} 项目列表的JSON字符串
     * @throws {Error} 如果项目所有者不存在或查询过程中发生错误
     */
    async queryProjectOwnerProjects(ctx, projectOwnerId) {
        try {
            // 验证项目所有者是否存在
            const projectOwnerKey = `PROJECTOWNER_${projectOwnerId}`;
            const projectOwnerBytes = await ctx.stub.getState(projectOwnerKey);
            if (!projectOwnerBytes || projectOwnerBytes.length === 0) {
                throw new Error(`项目所有者 ${projectOwnerId} 不存在`);
            }
            
            // 解析项目所有者数据
            const projectOwner = JSON.parse(projectOwnerBytes.toString());
            const projects = [];
            
            // 遍历项目ID列表，获取每个项目的详细信息
            for (const projectId of projectOwner.projectIds) {
                // 获取每个项目的数据
                const projectBytes = await ctx.stub.getState(projectId);
                // 如果项目存在，添加到结果数组
                if (projectBytes && projectBytes.length > 0) {
                    projects.push(JSON.parse(projectBytes.toString()));
                }
            }
            
            // 返回项目列表
            return JSON.stringify(projects);
        } catch (error) {
            // 错误处理：包装错误信息并重新抛出
            throw new Error(`查询项目所有者项目列表失败: ${error.message}`);
        }
    }
}

// 导出ProjectContract类，使其可以被其他模块引用
module.exports = ProjectContract; 