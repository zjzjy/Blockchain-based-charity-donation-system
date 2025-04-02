const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const projectOwnerController = require('./controllers/projectOwnerController');
const donorController = require('./controllers/donorController');
const projectController = require('./controllers/projectController');
const donationController = require('./controllers/donationController');
const milestoneController = require('./controllers/milestoneController');

// 路由
const projectOwnerRoutes = require('./routes/projectOwnerRoutes');
const donorRoutes = require('./routes/donorRoutes');
const projectRoutes = require('./routes/projectRoutes');
const donationRoutes = require('./routes/donationRoutes');
const milestoneRoutes = require('./routes/milestoneRoutes');

const logger = require('./utils/logger');

// 加载环境变量
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// 中间件
app.use(cors());
app.use(express.json());

// 路由
app.use('/api/projectOwner', projectOwnerRoutes);
app.use('/api/donor', donorRoutes);
app.use('/api/project', projectRoutes);
app.use('/api/donation', donationRoutes);
app.use('/api/milestone', milestoneRoutes);

// 错误处理中间件
app.use((err, req, res, next) => {
  logger.error(err.stack);
  res.status(500).json({ error: '服务器内部错误' });
});

// 初始化区块链连接
Promise.all([
  projectOwnerController.initialize(),
  donorController.initialize(),
  projectController.initialize(),
  donationController.initialize(),
  milestoneController.initialize()
])
  .then(() => {
    // 启动服务器
    app.listen(PORT, () => {
      logger.info(`服务器运行在端口 ${PORT}`);
    });
  })
  .catch((error) => {
    logger.error('初始化失败:', error);
    process.exit(1);
  }); 