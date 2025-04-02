const { Gateway, Wallets } = require('fabric-network');
const path = require('path');
const fs = require('fs');
const logger = require('../utils/logger');

class ProjectOwnerController {
  constructor() {
    this.gateway = null;
    this.network = null;
    this.contract = null;
  }

  async initialize() {
    try {
      const ccpPath = path.resolve(__dirname, '../../config/connection.json');
      const ccp = JSON.parse(fs.readFileSync(ccpPath, 'utf8'));

      const walletPath = path.join(process.cwd(), 'wallet');
      const wallet = await Wallets.newFileSystemWallet(walletPath);

      this.gateway = new Gateway();
      await this.gateway.connect(ccp, { wallet, identity: 'user1', discovery: { enabled: true, asLocalhost: true } });

      this.network = await this.gateway.getNetwork('mercychannel');
      this.contract = this.network.getContract('projectContract');
    } catch (error) {
      logger.error('初始化失败:', error);
      throw error;
    }
  }

  async registerProjectOwner(req, res) {
    try {
      const { projectOwnerId, name, email, phone, address } = req.body;

      // 验证必填字段
      if (!projectOwnerId || !name || !email || !phone || !address) {
        return res.status(400).json({ error: '所有字段都是必填的' });
      }

      // 检查项目所有者是否已存在
      try {
        const existingOwner = await this.contract.evaluateTransaction('queryProjectOwner', projectOwnerId);
        return res.status(400).json({ error: '项目所有者ID已存在' });
      } catch (error) {
        // 项目所有者不存在，继续注册
      }

      // 创建项目所有者
      await this.contract.submitTransaction(
        'createProjectOwner',
        projectOwnerId,
        name,
        email,
        phone,
        address
      );

      res.status(201).json({
        message: '项目所有者注册成功',
        projectOwnerId,
        name,
        email,
        phone,
        address
      });
    } catch (error) {
      logger.error('注册项目所有者失败:', error);
      res.status(500).json({ error: '注册失败: ' + error.message });
    }
  }

  async getProjectOwner(req, res) {
    try {
      const { projectOwnerId } = req.params;
      const result = await this.contract.evaluateTransaction('queryProjectOwner', projectOwnerId);
      res.json(JSON.parse(result.toString()));
    } catch (error) {
      logger.error('获取项目所有者信息失败:', error);
      res.status(500).json({ error: '获取失败: ' + error.message });
    }
  }

  async updateProjectOwner(req, res) {
    try {
      const { projectOwnerId } = req.params;
      const { name, email, phone, address } = req.body;

      // 验证项目所有者是否存在
      try {
        await this.contract.evaluateTransaction('queryProjectOwner', projectOwnerId);
      } catch (error) {
        return res.status(404).json({ error: '项目所有者不存在' });
      }

      // 更新项目所有者信息
      await this.contract.submitTransaction(
        'updateProjectOwner',
        projectOwnerId,
        name,
        email,
        phone,
        address
      );

      res.json({
        message: '项目所有者信息更新成功',
        projectOwnerId,
        name,
        email,
        phone,
        address
      });
    } catch (error) {
      logger.error('更新项目所有者信息失败:', error);
      res.status(500).json({ error: '更新失败: ' + error.message });
    }
  }

  async getProjectOwnerProjects(req, res) {
    try {
      const { projectOwnerId } = req.params;
      const result = await this.contract.evaluateTransaction('queryProjectOwnerProjects', projectOwnerId);
      res.json(JSON.parse(result.toString()));
    } catch (error) {
      logger.error('获取项目所有者项目列表失败:', error);
      res.status(500).json({ error: '获取失败: ' + error.message });
    }
  }
}

module.exports = new ProjectOwnerController(); 