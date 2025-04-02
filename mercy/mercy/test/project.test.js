'use strict';

const { Context } = require('fabric-contract-api');
const { ChaincodeStub } = require('fabric-shim');
const ProjectContract = require('../lib/projectContract');

describe('Project Contract Tests', () => {
    let contract;
    let ctx;
    let mockStub;

    beforeEach(() => {
        contract = new ProjectContract();
        mockStub = sinon.createStubInstance(ChaincodeStub);
        ctx = new Context();
        ctx.stub = mockStub;
    });

    describe('createProject', () => {
        it('should create a new project successfully', async () => {
            // 准备测试数据
            const projectId = 'PROJECT001';
            const projectOwnerId = 'OWNER001';
            const projectData = {
                projectId: projectId,
                name: '测试项目',
                description: '这是一个测试项目',
                startDate: '2024-03-23',
                endDate: '2024-12-31',
                categories: ['教育', '扶贫'],
                totalFundingRequired: 100000
            };

            // 模拟项目所有者存在
            mockStub.getState.withArgs(`PROJECTOWNER_${projectOwnerId}`).resolves(Buffer.from(JSON.stringify({
                projectOwnerId: projectOwnerId,
                name: '测试所有者',
                isVerified: true
            })));

            // 模拟项目不存在
            mockStub.getState.withArgs(projectId).resolves(null);

            // 设置客户端身份
            ctx.clientIdentity = {
                getAttributeValue: () => projectOwnerId
            };

            // 执行测试
            const result = await contract.createProject(
                ctx,
                projectId,
                projectData.name,
                projectData.description,
                projectData.startDate,
                projectData.endDate,
                projectData.categories,
                projectData.totalFundingRequired
            );

            // 验证结果
            expect(result).toBeDefined();
            expect(result.projectId).toBe(projectId);
            expect(result.owner).toBe(projectOwnerId);
            expect(result.status).toBe('ACTIVE');
            expect(result.currentFunding).toBe(0);

            // 验证状态更新
            expect(mockStub.putState).toHaveBeenCalledWith(
                projectId,
                expect.any(Buffer)
            );
        });

        it('should throw error if project owner does not exist', async () => {
            // 准备测试数据
            const projectId = 'PROJECT001';
            const projectOwnerId = 'OWNER001';

            // 模拟项目所有者不存在
            mockStub.getState.withArgs(`PROJECTOWNER_${projectOwnerId}`).resolves(null);

            // 设置客户端身份
            ctx.clientIdentity = {
                getAttributeValue: () => projectOwnerId
            };

            // 执行测试并验证错误
            await expect(contract.createProject(
                ctx,
                projectId,
                '测试项目',
                '描述',
                '2024-03-23',
                '2024-12-31',
                ['教育'],
                100000
            )).rejects.toThrow('项目所有者未注册或未通过验证');
        });
    });

    describe('updateProject', () => {
        it('should update project successfully', async () => {
            // 准备测试数据
            const projectId = 'PROJECT001';
            const projectOwnerId = 'OWNER001';
            const updates = {
                name: '更新后的项目名称',
                description: '更新后的描述'
            };

            // 模拟现有项目数据
            mockStub.getState.withArgs(projectId).resolves(Buffer.from(JSON.stringify({
                projectId: projectId,
                owner: projectOwnerId,
                name: '原项目名称',
                description: '原描述'
            })));

            // 设置客户端身份
            ctx.clientIdentity = {
                getAttributeValue: () => projectOwnerId
            };

            // 执行测试
            const result = await contract.updateProject(ctx, projectId, updates);

            // 验证结果
            expect(result).toBeDefined();
            expect(result.name).toBe(updates.name);
            expect(result.description).toBe(updates.description);
            expect(result.updatedAt).toBeDefined();

            // 验证状态更新
            expect(mockStub.putState).toHaveBeenCalledWith(
                projectId,
                expect.any(Buffer)
            );
        });

        it('should throw error if project does not exist', async () => {
            // 准备测试数据
            const projectId = 'PROJECT001';

            // 模拟项目不存在
            mockStub.getState.withArgs(projectId).resolves(null);

            // 执行测试并验证错误
            await expect(contract.updateProject(
                ctx,
                projectId,
                { name: '新名称' }
            )).rejects.toThrow('项目不存在');
        });
    });

    describe('getProject', () => {
        it('should return project data', async () => {
            // 准备测试数据
            const projectId = 'PROJECT001';
            const projectData = {
                projectId: projectId,
                name: '测试项目',
                description: '项目描述'
            };

            // 模拟项目数据
            mockStub.getState.withArgs(projectId).resolves(Buffer.from(JSON.stringify(projectData)));

            // 执行测试
            const result = await contract.getProject(ctx, projectId);

            // 验证结果
            expect(result).toBeDefined();
            expect(result.projectId).toBe(projectId);
            expect(result.name).toBe(projectData.name);
        });

        it('should throw error if project does not exist', async () => {
            // 准备测试数据
            const projectId = 'PROJECT001';

            // 模拟项目不存在
            mockStub.getState.withArgs(projectId).resolves(null);

            // 执行测试并验证错误
            await expect(contract.getProject(ctx, projectId))
                .rejects.toThrow('项目不存在');
        });
    });

    describe('validateProject', () => {
        it('should validate project data correctly', async () => {
            // 准备测试数据
            const validProject = {
                projectId: 'PROJECT001',
                name: '测试项目',
                description: '项目描述',
                totalFundingRequired: 100000,
                startDate: '2024-03-23',
                endDate: '2024-12-31'
            };

            // 执行测试
            await expect(contract.validateProject(validProject)).resolves.not.toThrow();

            // 测试无效数据
            const invalidProject = {
                projectId: 'PROJECT001',
                name: '',
                description: '',
                totalFundingRequired: 0,
                startDate: '2024-12-31',
                endDate: '2024-03-23'
            };

            await expect(contract.validateProject(invalidProject))
                .rejects.toThrow('项目ID、名称和描述为必填项');
        });
    });
}); 