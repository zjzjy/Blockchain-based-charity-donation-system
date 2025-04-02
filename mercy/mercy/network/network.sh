#!/bin/bash

# 设置环境变量
export PATH=${PWD}/../bin:$PATH
source ../config/.env

# 启动网络
function networkUp() {
    echo "Starting network..."
    docker-compose -f docker-compose.yaml up -d
    echo "Waiting for network to start..."
    sleep 10
}

# 部署链码
function deployChaincode() {
    echo "Deploying chaincode..."
    
    # 打包链码
    peer lifecycle chaincode package mercy.tar.gz --path ./mercy --lang node --label mercy_1.0
    
    # 安装链码到捐赠者组织节点
    echo "Installing chaincode to DonorOrg..."
    export CORE_PEER_LOCALMSPID="DonorOrgMSP"
    export CORE_PEER_TLS_ROOTCERT_FILE=${CA_PATH}
    export CORE_PEER_MSPCONFIGPATH=${USER_PATH}
    export CORE_PEER_ADDRESS=${PEER_ADDRESS}
    peer lifecycle chaincode install mercy.tar.gz
    
    # 安装链码到慈善机构组织节点
    echo "Installing chaincode to CharityOrg..."
    export CORE_PEER_LOCALMSPID="CharityOrgMSP"
    export CORE_PEER_TLS_ROOTCERT_FILE=${CHARITY_CA_PATH}
    export CORE_PEER_MSPCONFIGPATH=${CHARITY_USER_PATH}
    export CORE_PEER_ADDRESS=${CHARITY_PEER_ADDRESS}
    peer lifecycle chaincode install mercy.tar.gz
    
    # 批准链码 - 捐赠者组织
    echo "Approving chaincode for DonorOrg..."
    export CORE_PEER_LOCALMSPID="DonorOrgMSP"
    export CORE_PEER_TLS_ROOTCERT_FILE=${CA_PATH}
    export CORE_PEER_MSPCONFIGPATH=${USER_PATH}
    export CORE_PEER_ADDRESS=${PEER_ADDRESS}
    peer lifecycle chaincode approveformyorg -o localhost:7050 --ordererTLSHostnameOverride orderer.example.com --channelID ${CHANNEL_NAME} --name mercy --version 1.0 --package-id mercy_1.0:hash --sequence 1 --tls --cafile $ORDERER_CA
    
    # 批准链码 - 慈善机构组织
    echo "Approving chaincode for CharityOrg..."
    export CORE_PEER_LOCALMSPID="CharityOrgMSP"
    export CORE_PEER_TLS_ROOTCERT_FILE=${CHARITY_CA_PATH}
    export CORE_PEER_MSPCONFIGPATH=${CHARITY_USER_PATH}
    export CORE_PEER_ADDRESS=${CHARITY_PEER_ADDRESS}
    peer lifecycle chaincode approveformyorg -o localhost:7050 --ordererTLSHostnameOverride orderer.example.com --channelID ${CHANNEL_NAME} --name mercy --version 1.0 --package-id mercy_1.0:hash --sequence 1 --tls --cafile $ORDERER_CA
    
    # 提交链码
    echo "Committing chaincode..."
    peer lifecycle chaincode commit -o localhost:7050 --ordererTLSHostnameOverride orderer.example.com --channelID ${CHANNEL_NAME} --name mercy --version 1.0 --sequence 1 --tls --cafile $ORDERER_CA --peerAddresses ${PEER_ADDRESS} --tlsRootCertFiles ${CA_PATH} --peerAddresses ${CHARITY_PEER_ADDRESS} --tlsRootCertFiles ${CHARITY_CA_PATH}
}

# 注册用户
function registerUser() {
    # 注册捐赠者组织用户
    echo "Registering DonorOrg user..."
    fabric-ca-client register --caname ca-donororg --id.name user1 --id.secret user1pw --id.type client --tls.certfiles ${CA_PATH}
    fabric-ca-client enroll -u https://user1:user1pw@localhost:7054 --caname ca-donororg -M ${USER_PATH} --tls.certfiles ${CA_PATH}
    
    # 注册慈善机构组织用户
    echo "Registering CharityOrg user..."
    fabric-ca-client register --caname ca-charityorg --id.name user1 --id.secret user1pw --id.type client --tls.certfiles ${CHARITY_CA_PATH}
    fabric-ca-client enroll -u https://user1:user1pw@localhost:8054 --caname ca-charityorg -M ${CHARITY_USER_PATH} --tls.certfiles ${CHARITY_CA_PATH}
}

# 主函数
function main() {
    case $1 in
        up)
            networkUp
            ;;
        deploy)
            deployChaincode
            ;;
        register)
            registerUser
            ;;
        *)
            echo "Usage: $0 {up|deploy|register}"
            exit 1
            ;;
    esac
}

main $1 