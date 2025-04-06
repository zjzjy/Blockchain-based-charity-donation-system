# Hyperledger Fabric & Composer Playground 环境搭建完整指南

## 一、环境准备

### 1. 系统要求
- 操作系统：使用 Ubuntu 18.04/20.04 LTS 或 macOS
- 内存：至少 4GB RAM
- 磁盘空间：至少 20GB 可用空间

### 2. 前置软件安装
```bash
# 更新系统包
sudo apt-get update
sudo apt-get upgrade

# 安装必要工具
sudo apt-get install -y curl wget git build-essential
```

## 二、Docker环境配置

### 1. Docker安装
```bash
# 安装Docker
curl -fsSL https://get.docker.com | bash -s docker

# 将当前用户添加到docker组
sudo usermod -aG docker $USER

# 启动Docker服务
sudo systemctl start docker
sudo systemctl enable docker

# 验证Docker安装
docker --version
docker-compose --version
```

### 2. Docker配置优化
```bash
# 创建docker配置目录
sudo mkdir -p /etc/docker

# 配置Docker daemon
sudo tee /etc/docker/daemon.json <<EOF
{
  "registry-mirrors": ["https://registry.docker-cn.com"],
  "max-concurrent-downloads": 10,
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "100m",
    "max-file": "3"
  }
}
EOF

# 重启Docker服务
sudo systemctl daemon-reload
sudo systemctl restart docker
```

## 三、Node.js环境配置

### 1. Node.js安装
```bash
# 创建npm全局安装目录
mkdir ~/.npm-global

# 配置npm全局安装路径
npm config set prefix '~/.npm-global'

# 添加环境变量
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.profile
source ~/.profile
```

### 2. Composer工具安装
```bash
# 安装Yeoman工具
npm install -g yo

# 安装Composer相关工具
npm install -g composer-cli@0.20
npm install -g composer-rest-server@0.20
npm install -g generator-hyperledger-composer@0.20
npm install -g composer-playground@0.20

# 验证安装
npm list -g --depth=0
```

## 四、Hyperledger Fabric环境搭建

### 1. 准备工作目录
```bash
# 设置GOPATH
echo 'export GOPATH=$HOME/go' >> ~/.profile
source ~/.profile

# 创建工作目录
mkdir -p $GOPATH/src/github.com/hyperledger/
cd $GOPATH/src/github.com/hyperledger/

# 下载Fabric样例
curl -sSL http://bit.ly/2ysbOFE | bash -s -- 1.4.6 1.4.6 0.4.18
```

### 2. 配置Fabric网络
```bash
# 进入fabric-samples目录
cd fabric-samples

# 清理环境
docker ps -qa | xargs docker stop
docker ps -qa | xargs docker rm
docker images -a | grep "dev-peer" | awk '{print $3}' | xargs docker rmi

# 启动网络
cd basic-network
./start.sh
```

## 五、Composer Playground部署

### 1. 启动Composer Playground
```bash
# 后台启动Playground
nohup composer-playground -p 8080 -d &

# 访问地址
# http://localhost:8080
```

### 2. 创建业务网络卡片
```bash
# 创建PeerAdmin卡片
./createPeerAdminCard.sh

# 验证卡片创建
composer card list
```

## 六、网络配置和测试

### 1. 通道配置
```bash
# 进入配置目录
cd basic-network/config

# 解压通道配置文件
unzip channel.zip

# 检查配置
ls -la
```

### 2. 部署智能合约
```bash
# 安装智能合约
docker exec cli peer chaincode install -n mycc -v 1.0 -p github.com/chaincode/chaincode_example02/go/

# 实例化智能合约
docker exec cli peer chaincode instantiate -o orderer.example.com:7050 -C mychannel -n mycc -v 1.0 -c '{"Args":["init","a","100","b","200"]}' -P "AND ('Org1MSP.peer')"
```


#### 日常维护操作
```bash
# 定期清理Docker资源
docker system prune -a

# 备份重要配置
tar -czf fabric-config-backup.tar.gz basic-network/config/

# 检查系统状态
docker stats
```

## 七、参考资源
- [Hyperledger Fabric 官方文档](https://hyperledger-fabric.readthedocs.io/)
- [Hyperledger Composer 文档](https://hyperledger.github.io/composer/latest/)
- [Docker 官方文档](https://docs.docker.com/)
- [Node.js 官方文档](https://nodejs.org/docs/)
- tutorial 01-04
