// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title Staking Contract
 * @notice Allows users to stake ChronoLock (CLK) tokens for fixed periods to earn rewards.
 * @dev This contract manages staking pools, user deposits, and reward calculations.
 */
contract Staking is Ownable, ReentrancyGuard {
    // --- State Variables ---

    // --- Constants ---
    uint256 public constant SECONDS_IN_YEAR = 365 days;
    
    IERC20 public immutable stakingToken;

    Pool[] public stakingPools;
    uint256 public totalStaked;

    mapping(address => Stake[]) public stakesOf;

    // --- Structs ---

    struct Pool {
        uint256 duration; // Duration in seconds
        uint256 apr; // Annual Percentage Rate (e.g., 12 for 12%)
    }

    struct Stake {
        uint256 amount;
        uint256 startTime;
        uint256 unlockTime;
        uint256 poolId;
        bool claimed;
    }

    // --- Events ---

    event Staked(address indexed user, uint256 indexed poolId, uint256 amount, uint256 unlockTime);
    event Unstaked(address indexed user, uint256 amount, uint256 reward);
    event RewardPaid(address indexed user, uint256 reward);

    // --- Errors ---

    error InvalidPoolId();
    error InvalidAmount();
    error NotYetUnlocked();
    error AlreadyClaimed();
    error StakeIndexOutOfBounds();

    // --- Constructor ---

    /**
     * @notice Initializes the contract with the staking token and creates staking pools.
     * @param _stakingTokenAddress The address of the BEP-20 staking token (CLK).
     * @param _initialOwner The address of the contract owner.
     */
    constructor(address _stakingTokenAddress, address _initialOwner) Ownable(_initialOwner) {
        stakingToken = IERC20(_stakingTokenAddress);

        // Create staking pools as defined in the brief
        // Pool 1: 30 Days (APR: 12%)
        stakingPools.push(Pool({duration: 30 days, apr: 12}));
        // Pool 2: 90 Days (APR: 18%)
        stakingPools.push(Pool({duration: 90 days, apr: 18}));
        // Pool 3: 180 Days (APR: 25%)
        stakingPools.push(Pool({duration: 180 days, apr: 25}));
    }

    // --- Core Functions ---

    /**
     * @notice Stakes a specified amount of tokens into a chosen pool.
     * @dev Transfers tokens from the user to this contract.
     * @param _amount The amount of tokens to stake.
     * @param _poolId The ID of the staking pool (0, 1, or 2).
     */
    function stake(uint256 _amount, uint256 _poolId) external nonReentrant {
        if (_poolId >= stakingPools.length) revert InvalidPoolId();
        if (_amount == 0) revert InvalidAmount();

        Pool storage pool = stakingPools[_poolId];
        uint256 startTime = block.timestamp;
        uint256 unlockTime = startTime + pool.duration;

        // Transfer tokens from user to the contract
        stakingToken.transferFrom(msg.sender, address(this), _amount);

        stakesOf[msg.sender].push(
            Stake({
                amount: _amount,
                startTime: startTime,
                unlockTime: unlockTime,
                poolId: _poolId,
                claimed: false
            })
        );

        totalStaked += _amount;

        emit Staked(msg.sender, _poolId, _amount, unlockTime);
    }

    /**
     * @notice Unstakes tokens and claims rewards for a specific staking position.
     * @dev Can only be called after the lock-in period has ended.
     * @param _stakeIndex The index of the stake in the user's stake list.
     */
    function unstake(uint256 _stakeIndex) external nonReentrant {
        Stake[] storage userStakes = stakesOf[msg.sender];
        if (_stakeIndex >= userStakes.length) revert StakeIndexOutOfBounds();

        Stake storage userStake = userStakes[_stakeIndex];

        if (block.timestamp < userStake.unlockTime) revert NotYetUnlocked();
        if (userStake.claimed) revert AlreadyClaimed();

        uint256 reward = calculateReward(userStake.amount, userStake.poolId);
        userStake.claimed = true;
        totalStaked -= userStake.amount;

        uint256 totalPayout = userStake.amount + reward;

        // Transfer principal + reward
        stakingToken.transfer(msg.sender, totalPayout);

        emit Unstaked(msg.sender, userStake.amount, reward);
        if (reward > 0) emit RewardPaid(msg.sender, reward);
    }

    // --- View Functions ---

    /**
     * @notice Calculates the total reward for a given amount and pool.
     * @param _amount The principal amount staked.
     * @param _poolId The ID of the staking pool.
     * @return The calculated reward amount.
     */
    function calculateReward(uint256 _amount, uint256 _poolId) public view returns (uint256) {
        if (_poolId >= stakingPools.length) revert InvalidPoolId();
        Pool memory pool = stakingPools[_poolId];

        // Reward = (Amount * APR * Duration) / (100 * Seconds in a Year)
        // We use pool.duration directly, which is the exact staking period in seconds.
        return (_amount * pool.apr * pool.duration) / (SECONDS_IN_YEAR * 100);
    }

    /**
     * @notice Retrieves all staking information for a specific user.
     * @param _user The address of the user.
     * @return An array of the user's Stake structs.
     */
    function getStakes(address _user) external view returns (Stake[] memory) {
        return stakesOf[_user];
    }
}