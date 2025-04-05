// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract CharityProject {
    // 项目状态枚举
    enum ProjectStatus {
        REGISTERED,
        STARTED,
        IN_PROGRESS,
        COMPLETED,
        CANCELLED
    }

    // 筹资状态枚举
    enum FundingStatus {
        PENDING,
        PARTIALLY_FUNDED,
        FULLY_FUNDED,
        CANCELLED
    }

    // 捐赠者状态枚举
    enum DonorStatus {
        REGISTERED,
        ACTIVE,
        SUSPENDED,
        DELETED
    }

    // 里程碑结构
    struct Milestone {
        string milestoneId;
        string description;
        uint256 deadline;
        uint256 fundingAmount;
        bool isCompleted;
        uint256 completionDate;
        bool fundingReleased;
        string evidenceHash;
        uint256 approvalCount;              // 赞成票数
        uint256 totalVoters;                // 总投票人数
    }

    // 团队成员结构
    struct TeamMember {
        string memberId;
        string name;
        string role;
        string contactInfo;
    }

    // 捐赠者结构
    struct Donor {
        address donorAddress;
        string name;
        string contactInfo;
        uint256 registrationDate;
        uint256 totalDonated;
        uint256 donationCount;
        DonorStatus status;
    }

    // 项目结构
    struct Project {
        string projectId;
        string name;
        string description;
        uint256 startDate;
        uint256 endDate;
        string[] categories;
        uint256 totalFundingRequired;
        uint256 allocatedFunding;
        FundingStatus fundingStatus;
        ProjectStatus projectStatus;
        Milestone[] milestones;
        TeamMember[] teamMembers;
        address owner;
        address[] donors;          // 添加捐赠者列表
    }

    // 捐赠记录结构
    struct Donation {
        string transactionId;
        address donor;
        string projectId;
        uint256 amount;
        uint256 timestamp;
        string status;
    }

    // 状态变量
    mapping(string => Project) public projects;
    mapping(string => Donation) public donations;
    mapping(address => uint256) public donorBalances;
    mapping(string => bool) public projectExists;
    mapping(string => bool) public donationExists;
    mapping(address => Donor) public donors;
    mapping(address => bool) public isDonorRegistered;
    address[] public donorAddresses;
    
    // 存储所有项目ID
    string[] public projectIds;

    // 投票记录映射
    mapping(string => mapping(string => mapping(address => bool))) public milestoneVotes;  // projectId => milestoneId => voter => hasVoted
    mapping(string => mapping(string => address[])) public milestoneVoters;  // projectId => milestoneId => voters

    // 事件定义
    event ProjectCreated(string projectId, string name, address owner);
    event DonationMade(string transactionId, address donor, string projectId, uint256 amount);
    event MilestoneUpdated(string projectId, string milestoneId, bool isCompleted);
    event FundingReleased(string projectId, string milestoneId, address donor);
    event ProjectStatusUpdated(string projectId, ProjectStatus newStatus);
    event DonorRegistered(address donorAddress, string name);
    event DonorStatusUpdated(address donorAddress, DonorStatus status);
    event MilestoneVoted(string projectId, string milestoneId, address voter, bool approved);

    // 修饰器
    modifier onlyProjectOwner(string memory projectId) {
        require(projects[projectId].owner == msg.sender, "Only project owner can perform this action");
        _;
    }

    modifier projectExistsCheck(string memory projectId) {
        require(projectExists[projectId], "Project does not exist");
        _;
    }

    modifier donationExistsCheck(string memory transactionId) {
        require(donationExists[transactionId], "Donation does not exist");
        _;
    }

    modifier onlyRegisteredDonor() {
        require(isDonorRegistered[msg.sender], "Only registered donors can perform this action");
        _;
    }

    // 注册捐赠者
    function registerDonor(string memory name, string memory contactInfo) public {
        require(!isDonorRegistered[msg.sender], "Donor already registered");
        
        Donor storage donor = donors[msg.sender];
        donor.donorAddress = msg.sender;
        donor.name = name;
        donor.contactInfo = contactInfo;
        donor.registrationDate = block.timestamp;
        donor.totalDonated = 0;
        donor.donationCount = 0;
        donor.status = DonorStatus.REGISTERED;
        
        isDonorRegistered[msg.sender] = true;
        donorAddresses.push(msg.sender);
        
        emit DonorRegistered(msg.sender, name);
    }
    
    // 更新捐赠者状态
    function updateDonorStatus(address donorAddress, DonorStatus newStatus) public {
        require(isDonorRegistered[donorAddress], "Donor not registered");
        // 在实际应用中应添加管理员权限检查
        
        donors[donorAddress].status = newStatus;
        emit DonorStatusUpdated(donorAddress, newStatus);
    }
    
    // 获取捐赠者信息
    function getDonorInfo(address donorAddress) public view returns (
        string memory name,
        string memory contactInfo,
        uint256 registrationDate,
        uint256 totalDonated,
        uint256 donationCount,
        DonorStatus status
    ) {
        require(isDonorRegistered[donorAddress], "Donor not registered");
        
        Donor storage donor = donors[donorAddress];
        return (
            donor.name,
            donor.contactInfo,
            donor.registrationDate,
            donor.totalDonated,
            donor.donationCount,
            donor.status
        );
    }
    
    // 获取所有捐赠者数量
    function getDonorCount() public view returns (uint256) {
        return donorAddresses.length;
    }

    // 创建项目
    function createProject(
        string memory projectId,
        string memory name,
        string memory description,
        uint256 startDate,
        uint256 endDate,
        string[] memory categories,
        uint256 totalFundingRequired,
        Milestone[] memory milestones,
        TeamMember[] memory teamMembers
    ) public {
        require(!projectExists[projectId], "Project already exists");
        require(startDate < endDate, "Invalid dates");

        Project storage project = projects[projectId];
        project.projectId = projectId;
        project.name = name;
        project.description = description;
        project.startDate = startDate;
        project.endDate = endDate;
        project.categories = categories;
        project.totalFundingRequired = totalFundingRequired;
        project.allocatedFunding = 0;
        project.fundingStatus = FundingStatus.PENDING;
        project.projectStatus = ProjectStatus.REGISTERED;
        project.owner = msg.sender;

        // 添加里程碑
        for (uint i = 0; i < milestones.length; i++) {
            project.milestones.push(milestones[i]);
        }

        // 添加团队成员
        for (uint i = 0; i < teamMembers.length; i++) {
            project.teamMembers.push(teamMembers[i]);
        }

        projectExists[projectId] = true;
        projectIds.push(projectId); // 添加项目ID到数组
        emit ProjectCreated(projectId, name, msg.sender);
    }

    // 捐赠资金 (修改为需要注册的捐赠者)
    function makeDonation(string memory projectId) public payable onlyRegisteredDonor {
        require(projectExists[projectId], "Project does not exist");
        require(msg.value > 0, "Donation amount must be greater than 0");
        require(donors[msg.sender].status == DonorStatus.REGISTERED || 
                donors[msg.sender].status == DonorStatus.ACTIVE, 
                "Donor status not active");

        Project storage project = projects[projectId];
        require(project.projectStatus != ProjectStatus.CANCELLED, "Project is cancelled");
        require(project.projectStatus != ProjectStatus.COMPLETED, "Project is completed");

        // 生成唯一的交易ID
        string memory transactionId = string(abi.encodePacked(projectId, "_", toAsciiString(msg.sender)));
        
        // 记录捐赠信息
        donations[transactionId] = Donation({
            transactionId: transactionId,
            donor: msg.sender,
            projectId: projectId,
            amount: msg.value,
            timestamp: block.timestamp,
            status: "COMPLETED"
        });

        // 更新项目资金状态
        project.allocatedFunding += msg.value;
        
        // 检查是否达到或超过筹资目标
        if (project.allocatedFunding >= project.totalFundingRequired) {
            project.fundingStatus = FundingStatus.FULLY_FUNDED;
            
            // 如果项目状态为REGISTERED，则自动更新为STARTED
            if (project.projectStatus == ProjectStatus.REGISTERED) {
                project.projectStatus = ProjectStatus.STARTED;
                emit ProjectStatusUpdated(projectId, ProjectStatus.STARTED);
            }
        } else if (project.allocatedFunding > 0) {
            project.fundingStatus = FundingStatus.PARTIALLY_FUNDED;
        }

        // 更新捐赠者信息
        Donor storage donor = donors[msg.sender];
        donor.totalDonated += msg.value;
        donor.donationCount += 1;

        // 将捐赠者添加到项目的捐赠者列表中（如果还不在列表中）
        bool isDonorInProject = false;
        for (uint i = 0; i < project.donors.length; i++) {
            if (project.donors[i] == msg.sender) {
                isDonorInProject = true;
                break;
            }
        }
        if (!isDonorInProject) {
            project.donors.push(msg.sender);
        }

        donationExists[transactionId] = true;
        emit DonationMade(transactionId, msg.sender, projectId, msg.value);
    }

    // 辅助函数：将地址转换为字符串
    function toAsciiString(address x) internal pure returns (string memory) {
        bytes memory s = new bytes(40);
        for (uint i = 0; i < 20; i++) {
            bytes1 b = bytes1(uint8(uint(uint160(x)) / (2**(8*(19 - i)))));
            bytes1 hi = bytes1(uint8(b) / 16);
            bytes1 lo = bytes1(uint8(b) - 16 * uint8(hi));
            s[2*i] = char(hi);
            s[2*i+1] = char(lo);            
        }
        return string(s);
    }

    function char(bytes1 b) internal pure returns (bytes1 c) {
        if (uint8(b) < 10) return bytes1(uint8(b) + 0x30);
        else return bytes1(uint8(b) + 0x57);
    }

    // 更新里程碑
    function updateMilestone(
        string memory projectId,
        string memory milestoneId,
        bool isCompleted,
        string memory evidenceHash
    ) public onlyProjectOwner(projectId) projectExistsCheck(projectId) {
        Project storage project = projects[projectId];
        require(project.projectStatus != ProjectStatus.CANCELLED, "Project is cancelled");
        require(project.projectStatus != ProjectStatus.COMPLETED, "Project is completed");

        for (uint i = 0; i < project.milestones.length; i++) {
            if (keccak256(bytes(project.milestones[i].milestoneId)) == keccak256(bytes(milestoneId))) {
                project.milestones[i].isCompleted = isCompleted;
                if (isCompleted) {
                    project.milestones[i].completionDate = block.timestamp;
                    project.milestones[i].evidenceHash = evidenceHash;
                }
                emit MilestoneUpdated(projectId, milestoneId, isCompleted);
                break;
            }
        }
    }

    // 捐赠者对里程碑投票
    function voteMilestone(
        string memory projectId,
        string memory milestoneId,
        bool approve
    ) public onlyRegisteredDonor projectExistsCheck(projectId) {
        Project storage project = projects[projectId];
        require(project.projectStatus != ProjectStatus.CANCELLED, "Project is cancelled");
        require(project.projectStatus != ProjectStatus.COMPLETED, "Project is completed");

        // 检查是否是项目的捐赠者
        bool isDonor = false;
        for (uint i = 0; i < project.donors.length; i++) {
            if (project.donors[i] == msg.sender) {
                isDonor = true;
                break;
            }
        }
        require(isDonor, "Only project donors can vote");

        // 其余投票逻辑保持不变
        for (uint i = 0; i < project.milestones.length; i++) {
            if (keccak256(bytes(project.milestones[i].milestoneId)) == keccak256(bytes(milestoneId))) {
                require(project.milestones[i].isCompleted, "Milestone is not completed");
                require(!project.milestones[i].fundingReleased, "Funding already released");
                require(!milestoneVotes[projectId][milestoneId][msg.sender], "Already voted");

                milestoneVotes[projectId][milestoneId][msg.sender] = true;
                milestoneVoters[projectId][milestoneId].push(msg.sender);
                project.milestones[i].totalVoters++;
                
                if (approve) {
                    project.milestones[i].approvalCount++;
                }

                emit MilestoneVoted(projectId, milestoneId, msg.sender, approve);

                // 检查是否所有捐赠者都已投票并且全部同意
                if (project.milestones[i].approvalCount == project.donors.length &&
                    project.donors.length > 0) {
                    project.milestones[i].fundingReleased = true;
                    emit FundingReleased(projectId, milestoneId, msg.sender);
                    
                    // 检查是否所有里程碑都已完成并获得资金释放
                    if (areAllMilestonesCompleted(projectId) && areAllMilestonesFundingReleased(projectId)) {
                        // 自动更新项目状态为COMPLETED
                        project.projectStatus = ProjectStatus.COMPLETED;
                        emit ProjectStatusUpdated(projectId, ProjectStatus.COMPLETED);
                    } else if (project.projectStatus == ProjectStatus.REGISTERED) {
                        // 如果是第一个获得资金的里程碑，更新项目状态为STARTED
                        project.projectStatus = ProjectStatus.STARTED;
                        emit ProjectStatusUpdated(projectId, ProjectStatus.STARTED);
                    } else if (project.projectStatus == ProjectStatus.STARTED) {
                        // 如果项目已经开始但尚未完成所有里程碑，更新为IN_PROGRESS
                        project.projectStatus = ProjectStatus.IN_PROGRESS;
                        emit ProjectStatusUpdated(projectId, ProjectStatus.IN_PROGRESS);
                    }
                }
                break;
            }
        }
    }

    // 检查项目是否所有里程碑都已释放资金
    function areAllMilestonesFundingReleased(string memory projectId) 
        public 
        view 
        projectExistsCheck(projectId) 
        returns (bool) 
    {
        Project storage project = projects[projectId];
        for (uint i = 0; i < project.milestones.length; i++) {
            if (!project.milestones[i].fundingReleased) {
                return false;
            }
        }
        return true;
    }

    // 获取里程碑投票状态
    function getMilestoneVoteStatus(string memory projectId, string memory milestoneId)
        public
        view
        projectExistsCheck(projectId)
        returns (
            uint256 totalVotes,
            uint256 approvalCount,
            bool hasVoted,
            bool fundingReleased
        )
    {
        Project storage project = projects[projectId];
        for (uint i = 0; i < project.milestones.length; i++) {
            if (keccak256(bytes(project.milestones[i].milestoneId)) == keccak256(bytes(milestoneId))) {
                return (
                    project.milestones[i].totalVoters,
                    project.milestones[i].approvalCount,
                    milestoneVotes[projectId][milestoneId][msg.sender],
                    project.milestones[i].fundingReleased
                );
            }
        }
        revert("Milestone not found");
    }

    // 获取里程碑的所有投票者
    function getMilestoneVoters(string memory projectId, string memory milestoneId)
        public
        view
        projectExistsCheck(projectId)
        returns (address[] memory)
    {
        return milestoneVoters[projectId][milestoneId];
    }

    // 修改审核里程碑资金函数
    function approveMilestoneFunding(
        string memory projectId,
        string memory /* milestoneId */,
        bool /* approved */
    ) public view projectExistsCheck(projectId) {
        revert("This function is deprecated. Please use voteMilestone instead.");
    }

    // 更新项目状态
    function updateProjectStatus(string memory projectId, ProjectStatus newStatus) 
        public 
        onlyProjectOwner(projectId) 
        projectExistsCheck(projectId) 
    {
        Project storage project = projects[projectId];
        require(project.projectStatus != ProjectStatus.CANCELLED, "Project is cancelled");
        require(project.projectStatus != ProjectStatus.COMPLETED, "Project is completed");

        project.projectStatus = newStatus;
        emit ProjectStatusUpdated(projectId, newStatus);
    }

    // 获取项目信息
    function getProject(string memory projectId) 
        public 
        view 
        projectExistsCheck(projectId) 
        returns (
            string memory name,
            string memory description,
            uint256 startDate,
            uint256 endDate,
            string[] memory categories,
            uint256 totalFundingRequired,
            uint256 allocatedFunding,
            FundingStatus fundingStatus,
            ProjectStatus projectStatus,
            address owner
        ) 
    {
        Project storage project = projects[projectId];
        return (
            project.name,
            project.description,
            project.startDate,
            project.endDate,
            project.categories,
            project.totalFundingRequired,
            project.allocatedFunding,
            project.fundingStatus,
            project.projectStatus,
            project.owner
        );
    }

    // 获取项目里程碑
    function getProjectMilestones(string memory projectId) 
        public 
        view 
        projectExistsCheck(projectId) 
        returns (Milestone[] memory) 
    {
        return projects[projectId].milestones;
    }

    // 获取项目团队成员
    function getProjectTeamMembers(string memory projectId) 
        public 
        view 
        projectExistsCheck(projectId) 
        returns (TeamMember[] memory) 
    {
        return projects[projectId].teamMembers;
    }

    // 获取捐赠记录
    function getDonation(string memory transactionId) 
        public 
        view 
        donationExistsCheck(transactionId) 
        returns (
            address donor,
            string memory projectId,
            uint256 amount,
            uint256 timestamp,
            string memory status
        ) 
    {
        Donation storage donation = donations[transactionId];
        return (
            donation.donor,
            donation.projectId,
            donation.amount,
            donation.timestamp,
            donation.status
        );
    }

    // 检查项目是否所有里程碑都已完成
    function areAllMilestonesCompleted(string memory projectId) 
        public 
        view 
        projectExistsCheck(projectId) 
        returns (bool) 
    {
        Project storage project = projects[projectId];
        for (uint i = 0; i < project.milestones.length; i++) {
            if (!project.milestones[i].isCompleted) {
                return false;
            }
        }
        return true;
    }

    // 获取项目的总捐赠金额
    function getProjectTotalDonations(string memory projectId) 
        public 
        view 
        projectExistsCheck(projectId) 
        returns (uint256) 
    {
        return projects[projectId].allocatedFunding;
    }

    // 获取项目的捐赠记录数量
    function getProjectDonationCount(string memory projectId) 
        public 
        view 
        projectExistsCheck(projectId) 
        returns (uint256) 
    {
        return projects[projectId].donors.length;
    }

    // 获取项目的所有捐赠者
    function getProjectDonors(string memory projectId) public view projectExistsCheck(projectId) returns (address[] memory) {
        return projects[projectId].donors;
    }

    // 检查捐赠ID是否存在
    function checkDonationExists(string memory transactionId) public view returns (bool) {
        return donationExists[transactionId];
    }
    
    // 生成交易ID查询辅助函数
    function generateDonationId(string memory projectId, address donor) public pure returns (string memory) {
        return string(abi.encodePacked(projectId, "_", toAsciiString(donor)));
    }

    // 获取所有项目ID列表
    function getAllProjectIds() public view returns (string[] memory) {
        return projectIds;
    }
    
    // 获取项目总数
    function getProjectCount() public view returns (uint256) {
        return projectIds.length;
    }
    
    // 获取项目概要信息（轻量版，不包含里程碑和团队成员详情）
    function getProjectSummary(string memory projectId) 
        public 
        view 
        projectExistsCheck(projectId) 
        returns (
            string memory name,
            string memory description,
            uint256 startDate,
            uint256 endDate,
            string[] memory categories,
            uint256 totalFundingRequired,
            uint256 allocatedFunding,
            FundingStatus fundingStatus,
            ProjectStatus projectStatus,
            uint256 milestoneCount,
            uint256 teamMemberCount,
            address owner,
            uint256 donorCount
        ) 
    {
        Project storage project = projects[projectId];
        return (
            project.name,
            project.description,
            project.startDate,
            project.endDate,
            project.categories,
            project.totalFundingRequired,
            project.allocatedFunding,
            project.fundingStatus,
            project.projectStatus,
            project.milestones.length,
            project.teamMembers.length,
            project.owner,
            project.donors.length
        );
    }
    
    // 分页获取项目ID列表
    function getProjectIdsPaginated(uint256 startIndex, uint256 count) public view returns (string[] memory) {
        require(startIndex < projectIds.length, "Start index out of bounds");
        
        // 确定实际要返回的数量
        uint256 actualCount = count;
        if (startIndex + count > projectIds.length) {
            actualCount = projectIds.length - startIndex;
        }
        
        string[] memory result = new string[](actualCount);
        for (uint256 i = 0; i < actualCount; i++) {
            result[i] = projectIds[startIndex + i];
        }
        
        return result;
    }
    
    // 获取项目信息的结构体
    struct ProjectInfo {
        string projectId;
        string name;
        string description;
        uint256 startDate;
        uint256 endDate;
        string[] categories;
        uint256 totalFundingRequired;
        uint256 allocatedFunding;
        FundingStatus fundingStatus;
        ProjectStatus projectStatus;
        uint256 milestoneCount;
        uint256 teamMemberCount;
        address owner;
        uint256 donorCount;
    }
    
    // 分页获取项目详细信息
    function getProjectsRange(uint256 startIndex, uint256 count) public view returns (ProjectInfo[] memory) {
        require(startIndex < projectIds.length, "Start index out of bounds");
        
        // 确定实际要返回的数量
        uint256 actualCount = count;
        if (startIndex + count > projectIds.length) {
            actualCount = projectIds.length - startIndex;
        }
        
        ProjectInfo[] memory result = new ProjectInfo[](actualCount);
        
        for (uint256 i = 0; i < actualCount; i++) {
            string memory projectId = projectIds[startIndex + i];
            Project storage project = projects[projectId];
            
            result[i] = ProjectInfo({
                projectId: project.projectId,
                name: project.name,
                description: project.description,
                startDate: project.startDate,
                endDate: project.endDate,
                categories: project.categories,
                totalFundingRequired: project.totalFundingRequired,
                allocatedFunding: project.allocatedFunding,
                fundingStatus: project.fundingStatus,
                projectStatus: project.projectStatus,
                milestoneCount: project.milestones.length,
                teamMemberCount: project.teamMembers.length,
                owner: project.owner,
                donorCount: project.donors.length
            });
        }
        
        return result;
    }
    
    // 获取简化版项目信息（减少栈深度）
    function getAllProjectsSimplified() public view returns (ProjectInfo[] memory) {
        return getProjectsRange(0, projectIds.length);
    }
} 