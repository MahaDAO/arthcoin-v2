// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;
pragma experimental ABIEncoderV2;

import './Pausable.sol';
import '../Math/Math.sol';
import '../ARTH/IARTH.sol';
import '../ERC20/IERC20.sol';
import '../Math/SafeMath.sol';
import '../ERC20/SafeERC20.sol';
import './IStakingRewardsDual.sol';
import '../Utils/StringHelpers.sol';
import '../ARTH/IARTHController.sol';
import '../Utils/ReentrancyGuard.sol';
import '../Uniswap/TransferHelper.sol';

/**
 * @title  StakingRewardsDualV2
 * @author MahaDAO.
 *
 * Original code written by:
 * - Travis Moore, Jason Huan, Same Kazemian, Sam Sun.
 *
 * Modified originally from Synthetixio
 * https://raw.githubusercontent.com/Synthetixio/synthetix/develop/contracts/StakingRewards.sol
 */
contract StakingRewardsDualV2 is
    IStakingRewardsDual,
    ReentrancyGuard,
    Pausable
{
    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    /**
     * State variables.
     */

    struct LockedStake {
        bytes32 kekId;
        uint256 startTimestamp;
        uint256 amount;
        uint256 endingTimestamp;
        uint256 multiplier; // 6 decimals of precision. 1x = 1000000
    }

    IERC20 public stakingToken;
    IERC20 public rewardsToken0;
    IERC20 public rewardsToken1;
    IARTH private _ARTH;
    IARTHController private _arthController;

    uint256 public periodFinish;
    // Max reward per second
    uint256 public rewardRate0;
    uint256 public rewardRate1;
    // uint256 public rewardsDuration = 86400 hours;
    uint256 public rewardsDuration = 604800; // 7 * 86400  (7 days)

    // This staking pool's percentage of the total ARTHX being distributed by all pools, 6 decimals of precision
    uint256 public poolWeight0;
    // This staking pool's percentage of the total TOKEN 2 being distributed by all pools, 6 decimals of precision
    uint256 public poolWeight1;
    uint256 public lastUpdateTime;
    uint256 public rewardPerTokenStored0 = 0;
    uint256 public rewardPerTokenStored1 = 0;

    uint256 public lockedStakeMinTime = 604800; // 7 * 86400  (7 days)
    uint256 public lockedStakeMaxMultiplier = 2000000; // 6 decimals of precision. 1x = 1000000
    uint256 public crBoostMaxMultiplier = 1000000; // 6 decimals of precision. 1x = 1000000
    uint256 public lockedStakeTimeForMaxMultiplier = 3 * 365 * 86400; // 3 years

    bool public migrationsOn = false; // Used for migrations. Prevents new stakes, but allows LP and reward withdrawals
    bool public stakesUnlocked = false; // Release locked stakes in case of system migration or emergency
    bool public token1RewardsOn = false;
    bool public withdrawalsPaused = false; // For emergencies
    bool public rewardsCollectionPaused = false; // For emergencies

    address public ownerAddress;
    address public timelockAddress; // Governance timelock address

    mapping(address => bool) public greylist;

    // List of valid migrators (set by governance)
    mapping(address => bool) public validMigrators;

    mapping(address => uint256) public rewards0;
    mapping(address => uint256) public rewards1;
    mapping(address => uint256) public userRewardPerTokenPaid0;
    mapping(address => uint256) public userRewardPerTokenPaid1;

    // Stakers set which migrator(s) they want to use
    mapping(address => mapping(address => bool)) public stakerAllowedMigrators;

    address[] public validMigratorsArray;

    uint256 private constant _PRICE_PRECISION = 1e6;
    uint256 private constant _MULTIPLIER_BASE = 1e6;
    string private _lockedStakeMinTimeStr = '604800'; // 7 days on genesis

    uint256 private _stakingTokenSupply = 0;
    uint256 private _stakingTokenBoostedSupply = 0;

    mapping(address => uint256) private _lockedBalances;
    mapping(address => uint256) private _boostedBalances;
    mapping(address => uint256) private _unlockedBalances;
    mapping(address => LockedStake[]) private _lockedStakes;

    /**
     * Events.
     */

    event RewardAdded(uint256 reward);
    event Staked(address indexed user, uint256 amount, address sourceAddress);
    event StakeLocked(
        address indexed user,
        uint256 amount,
        uint256 secs,
        address sourceAddress
    );
    event Withdrawn(
        address indexed user,
        uint256 amount,
        address destinationAddress
    );
    event WithdrawnLocked(
        address indexed user,
        uint256 amount,
        bytes32 kekId,
        address destinationAddress
    );
    event RewardPaid(
        address indexed user,
        uint256 reward,
        address token_address,
        address destinationAddress
    );
    event RewardsDurationUpdated(uint256 newDuration);
    event Recovered(address token, uint256 amount);
    event RewardsPeriodRenewed(address token);
    event DefaultInitialization();
    event LockedStakeMaxMultiplierUpdated(uint256 multiplier);
    event LockedStakeTimeForMaxMultiplier(uint256 secs);
    event LockedStakeMinTime(uint256 secs);
    event MaxCRBoostMultiplier(uint256 multiplier);

    /**
     * Modifiers.
     */

    modifier onlyByOwnerOrGovernance() {
        require(
            msg.sender == ownerAddress || msg.sender == timelockAddress,
            'You are not the owner or the governance timelock'
        );
        _;
    }

    modifier onlyByOwnerOrGovernanceOrMigrator() {
        require(
            msg.sender == ownerAddress ||
                msg.sender == timelockAddress ||
                validMigrators[msg.sender] == true,
            'You are not the owner, governance timelock, or a migrator'
        );
        _;
    }

    modifier isMigrating() {
        require(migrationsOn == true, 'Contract is not in migration');
        _;
    }

    modifier notWithdrawalsPaused() {
        require(withdrawalsPaused == false, 'Withdrawals are paused');
        _;
    }

    modifier notRewardsCollectionPaused() {
        require(
            rewardsCollectionPaused == false,
            'Rewards collection is paused'
        );
        _;
    }

    modifier updateReward(address account) {
        // Need to retro-adjust some things if the period hasn't been renewed, then start a new one
        sync();

        if (account != address(0)) {
            (uint256 earned0, uint256 earned1) = earned(account);
            rewards0[account] = earned0;
            rewards1[account] = earned1;
            userRewardPerTokenPaid0[account] = rewardPerTokenStored0;
            userRewardPerTokenPaid1[account] = rewardPerTokenStored1;
        }
        _;
    }

    /**
     * Constructor.
     */

    constructor(
        address _owner,
        address _rewardsToken0,
        address _rewardsToken1,
        address _stakingToken,
        address _arthAddress,
        address _timelockAddress,
        uint256 _poolWeight0,
        uint256 _poolWeight1
    ) {
        ownerAddress = _owner;

        _ARTH = IARTH(_arthAddress);
        rewardsToken0 = IERC20(_rewardsToken0);
        rewardsToken1 = IERC20(_rewardsToken1);
        stakingToken = IERC20(_stakingToken);

        poolWeight0 = _poolWeight0;
        poolWeight1 = _poolWeight1;
        lastUpdateTime = block.timestamp;
        timelockAddress = _timelockAddress;

        // 1000 ARTHX a day
        rewardRate0 = (uint256(365000e18)).div(365 * 86400);
        rewardRate0 = rewardRate0.mul(poolWeight0).div(1e6);

        // ??? CRVDAO a day eventually
        rewardRate1 = 0;
        migrationsOn = false;
        stakesUnlocked = false;
        rewardRate1 = rewardRate1.mul(poolWeight1).div(1e6);
    }

    /**
     * External.
     */

    // Two different stake functions are needed because of delegateCall and msg.sender issues (important for migration)
    function stake(uint256 amount) external override {
        _stake(msg.sender, msg.sender, amount);
    }

    // Two different stake functions are needed because of delegateCall and msg.sender issues (important for migration)
    function stakeLocked(uint256 amount, uint256 secs) external override {
        _stakeLocked(msg.sender, msg.sender, amount, secs);
    }

    // Two different withdrawer functions are needed because of delegateCall and msg.sender issues (important for migration)
    function withdraw(uint256 amount) external override {
        _withdraw(msg.sender, msg.sender, amount);
    }

    // Two different withdrawLocked functions are needed because of delegateCall and msg.sender issues (important for migration)
    function withdrawLocked(bytes32 kekId) external override {
        _withdrawLocked(msg.sender, msg.sender, kekId);
    }

    // Added to support recovering LP Rewards and other mistaken tokens from other systems to be distributed to holders
    function recoverERC20(address tokenAddress, uint256 tokenAmount)
        external
        onlyByOwnerOrGovernance
    {
        // Admin cannot withdraw the staking token from the contract unless currently migrating
        if (!migrationsOn) {
            require(
                tokenAddress != address(stakingToken),
                'Cannot withdraw staking tokens unless migration is on'
            ); // Only Governance / Timelock can trigger a migration
        }
        // Only the owner address can ever receive the recovery withdrawal
        IERC20(tokenAddress).transfer(ownerAddress, tokenAmount);

        emit Recovered(tokenAddress, tokenAmount);
    }

    function setRewardsDuration(uint256 _rewardsDuration)
        external
        onlyByOwnerOrGovernance
    {
        require(
            periodFinish == 0 || block.timestamp > periodFinish,
            'Previous rewards period must be complete before changing the duration for the new period'
        );
        rewardsDuration = _rewardsDuration;
        emit RewardsDurationUpdated(rewardsDuration);
    }

    function setMultipliers(
        uint256 _lockedStakeMaxMultiplier,
        uint256 _crBoostMaxMultiplier
    ) external onlyByOwnerOrGovernance {
        require(
            _lockedStakeMaxMultiplier >= 1,
            'Multiplier must be greater than or equal to 1'
        );
        require(
            _crBoostMaxMultiplier >= 1,
            'Max CR Boost must be greater than or equal to 1'
        );

        lockedStakeMaxMultiplier = _lockedStakeMaxMultiplier;
        crBoostMaxMultiplier = _crBoostMaxMultiplier;

        emit MaxCRBoostMultiplier(crBoostMaxMultiplier);
        emit LockedStakeMaxMultiplierUpdated(lockedStakeMaxMultiplier);
    }

    function setLockedStakeTimeForMinAndMaxMultiplier(
        uint256 _lockedStakeTimeForMaxMultiplier,
        uint256 _lockedStakeMinTime
    ) external onlyByOwnerOrGovernance {
        require(
            _lockedStakeTimeForMaxMultiplier >= 1,
            'Multiplier Max Time must be greater than or equal to 1'
        );
        require(
            _lockedStakeMinTime >= 1,
            'Multiplier Min Time must be greater than or equal to 1'
        );

        lockedStakeTimeForMaxMultiplier = _lockedStakeTimeForMaxMultiplier;

        lockedStakeMinTime = _lockedStakeMinTime;
        _lockedStakeMinTimeStr = StringHelpers.uint2str(_lockedStakeMinTime);

        emit LockedStakeTimeForMaxMultiplier(lockedStakeTimeForMaxMultiplier);
        emit LockedStakeMinTime(_lockedStakeMinTime);
    }

    function initializeDefault() external onlyByOwnerOrGovernance {
        lastUpdateTime = block.timestamp;
        periodFinish = block.timestamp.add(rewardsDuration);
        emit DefaultInitialization();
    }

    function greylistAddress(address _address)
        external
        onlyByOwnerOrGovernance
    {
        greylist[_address] = !(greylist[_address]);
    }

    function unlockStakes() external onlyByOwnerOrGovernance {
        stakesUnlocked = !stakesUnlocked;
    }

    function toggleMigrations() external onlyByOwnerOrGovernance {
        migrationsOn = !migrationsOn;
    }

    function toggleWithdrawals() external onlyByOwnerOrGovernance {
        withdrawalsPaused = !withdrawalsPaused;
    }

    function toggleRewardsCollection() external onlyByOwnerOrGovernance {
        rewardsCollectionPaused = !rewardsCollectionPaused;
    }

    function setRewardRates(
        uint256 _new_rate0,
        uint256 _new_rate1,
        bool sync_too
    ) external onlyByOwnerOrGovernance {
        rewardRate0 = _new_rate0;
        rewardRate1 = _new_rate1;

        if (sync_too) {
            sync();
        }
    }

    // Migrator can stake for someone else (they won't be able to withdraw it back though, only staker_address can)
    function migrator_stake_for(address staker_address, uint256 amount)
        external
        isMigrating
    {
        require(
            migratorApprovedForStaker(staker_address, msg.sender),
            'msg.sender is either an invalid migrator or the staker has not approved them'
        );
        _stake(staker_address, msg.sender, amount);
    }

    // Migrator can stake for someone else (they won't be able to withdraw it back though, only staker_address can).
    function migrator_stakeLocked_for(
        address staker_address,
        uint256 amount,
        uint256 secs
    ) external isMigrating {
        require(
            migratorApprovedForStaker(staker_address, msg.sender),
            'msg.sender is either an invalid migrator or the staker has not approved them'
        );
        _stakeLocked(staker_address, msg.sender, amount, secs);
    }

    // Used for migrations
    function migrator_withdraw_unlocked(address staker_address)
        external
        isMigrating
    {
        require(
            migratorApprovedForStaker(staker_address, msg.sender),
            'msg.sender is either an invalid migrator or the staker has not approved them'
        );
        _withdraw(
            staker_address,
            msg.sender,
            _unlockedBalances[staker_address]
        );
    }

    // Used for migrations
    function migrator_withdraw_locked(address staker_address, bytes32 kekId)
        external
        isMigrating
    {
        require(
            migratorApprovedForStaker(staker_address, msg.sender),
            'msg.sender is either an invalid migrator or the staker has not approved them'
        );
        _withdrawLocked(staker_address, msg.sender, kekId);
    }

    function toggleToken1Rewards() external onlyByOwnerOrGovernance {
        if (token1RewardsOn) {
            rewardRate1 = 0;
        }
        token1RewardsOn = !token1RewardsOn;
    }

    function setOwner(address _ownerAddress) external onlyByOwnerOrGovernance {
        ownerAddress = _ownerAddress;
    }

    function setTimelock(address _new_timelock)
        external
        onlyByOwnerOrGovernance
    {
        timelockAddress = _new_timelock;
    }

    function renewIfApplicable() external {
        if (block.timestamp > periodFinish) {
            _retroCatchUp();
        }
    }

    function totalSupply() external view override returns (uint256) {
        return _stakingTokenSupply;
    }

    function totalBoostedSupply() external view returns (uint256) {
        return _stakingTokenBoostedSupply;
    }

    function getRewardForDuration()
        external
        view
        override
        returns (uint256, uint256)
    {
        return (
            rewardRate0.mul(rewardsDuration).mul(crBoostMultiplier()).div(
                _PRICE_PRECISION
            ),
            rewardRate1.mul(rewardsDuration)
        );
    }

    /**
     * Public.
     */

    function stakingMultiplier(uint256 secs) public view returns (uint256) {
        uint256 multiplier =
            uint256(_MULTIPLIER_BASE).add(
                secs.mul(lockedStakeMaxMultiplier.sub(_MULTIPLIER_BASE)).div(
                    lockedStakeTimeForMaxMultiplier
                )
            );
        if (multiplier > lockedStakeMaxMultiplier)
            multiplier = lockedStakeMaxMultiplier;
        return multiplier;
    }

    function crBoostMultiplier() public view returns (uint256) {
        uint256 multiplier =
            uint256(_MULTIPLIER_BASE).add(
                (
                    uint256(_MULTIPLIER_BASE).sub(
                        _arthController.getGlobalCollateralRatio()
                    )
                )
                    .mul(crBoostMaxMultiplier.sub(_MULTIPLIER_BASE))
                    .div(_MULTIPLIER_BASE)
            );
        return multiplier;
    }

    // Total unlocked and locked liquidity tokens
    function balanceOf(address account)
        external
        view
        override
        returns (uint256)
    {
        return (_unlockedBalances[account]).add(_lockedBalances[account]);
    }

    // Total unlocked liquidity tokens
    function unlockedBalanceOf(address account)
        external
        view
        returns (uint256)
    {
        return _unlockedBalances[account];
    }

    // Total locked liquidity tokens
    function lockedBalanceOf(address account) public view returns (uint256) {
        return _lockedBalances[account];
    }

    // Total 'balance' used for calculating the percent of the pool the account owns
    // Takes into account the locked stake time multiplier
    function boostedBalanceOf(address account) external view returns (uint256) {
        return _boostedBalances[account];
    }

    function _lockedStakesOf(address account)
        external
        view
        returns (LockedStake[] memory)
    {
        return _lockedStakes[account];
    }

    function stakingDecimals() external view returns (uint256) {
        return stakingToken.decimals();
    }

    function rewardsFor(address account)
        external
        view
        returns (uint256, uint256)
    {
        // You may have use earned() instead, because of the order in which the contract executes
        return (rewards0[account], rewards1[account]);
    }

    function lastTimeRewardApplicable() public view override returns (uint256) {
        return Math.min(block.timestamp, periodFinish);
    }

    function rewardPerToken() public view override returns (uint256, uint256) {
        if (_stakingTokenSupply == 0) {
            return (rewardPerTokenStored0, rewardPerTokenStored1);
        } else {
            return (
                // Boosted emission
                rewardPerTokenStored0.add(
                    lastTimeRewardApplicable()
                        .sub(lastUpdateTime)
                        .mul(rewardRate0)
                        .mul(crBoostMultiplier())
                        .mul(1e18)
                        .div(_PRICE_PRECISION)
                        .div(_stakingTokenBoostedSupply)
                ),
                // Flat emission
                // Locked stakes will still get more weight with token1 rewards, but the CR boost will be canceled out for everyone
                rewardPerTokenStored1.add(
                    lastTimeRewardApplicable()
                        .sub(lastUpdateTime)
                        .mul(rewardRate1)
                        .mul(1e18)
                        .div(_stakingTokenBoostedSupply)
                )
            );
        }
    }

    function earned(address account)
        public
        view
        override
        returns (uint256, uint256)
    {
        (uint256 reward0, uint256 reward1) = rewardPerToken();
        return (
            _boostedBalances[account]
                .mul(reward0.sub(userRewardPerTokenPaid0[account]))
                .div(1e18)
                .add(rewards0[account]),
            _boostedBalances[account]
                .mul(reward1.sub(userRewardPerTokenPaid1[account]))
                .div(1e18)
                .add(rewards1[account])
        );
    }

    function migratorApprovedForStaker(
        address staker_address,
        address migrator_address
    ) public view returns (bool) {
        // Migrator is not a valid one
        if (validMigrators[migrator_address] == false) return false;

        // Staker has to have approved this particular migrator
        if (stakerAllowedMigrators[staker_address][migrator_address] == true)
            return true;

        // Otherwise, return false
        return false;
    }

    // Staker can allow a migrator
    function stakerAllowMigrator(address migrator_address) public {
        require(
            stakerAllowedMigrators[msg.sender][migrator_address] == false,
            'Address already exists'
        );
        require(validMigrators[migrator_address], 'Invalid migrator address');
        stakerAllowedMigrators[msg.sender][migrator_address] = true;
    }

    // Staker can disallow a previously-allowed migrator
    function stakerDisallowMigrator(address migrator_address) public {
        require(
            stakerAllowedMigrators[msg.sender][migrator_address] == true,
            "Address doesn't exist already"
        );

        // Redundant
        // require(validMigrators[migrator_address], "Invalid migrator address");

        // Delete from the mapping
        delete stakerAllowedMigrators[msg.sender][migrator_address];
    }

    // Two different getReward functions are needed because of delegateCall and msg.sender issues (important for migration)
    function getReward() public override {
        _getReward(msg.sender, msg.sender);
    }

    function sync() public {
        if (block.timestamp > periodFinish) {
            _retroCatchUp();
        } else {
            (uint256 reward0, uint256 reward1) = rewardPerToken();
            rewardPerTokenStored0 = reward0;
            rewardPerTokenStored1 = reward1;
            lastUpdateTime = lastTimeRewardApplicable();
        }
    }

    // Adds supported migrator address
    function addMigrator(address migrator_address)
        public
        onlyByOwnerOrGovernance
    {
        require(
            validMigrators[migrator_address] == false,
            'address already exists'
        );
        validMigrators[migrator_address] = true;
        validMigratorsArray.push(migrator_address);
    }

    // Remove a migrator address
    function removeMigrator(address migrator_address)
        public
        onlyByOwnerOrGovernance
    {
        require(
            validMigrators[migrator_address] == true,
            "address doesn't exist already"
        );

        // Delete from the mapping
        delete validMigrators[migrator_address];

        // 'Delete' from the array by setting the address to 0x0
        for (uint256 i = 0; i < validMigratorsArray.length; i++) {
            if (validMigratorsArray[i] == migrator_address) {
                validMigratorsArray[i] = address(0); // This will leave a null in the array and keep the indices the same
                break;
            }
        }
    }

    /**
     * Internal.
     */

    // If this were not internal, and sourceAddress had an infinite approve, this could be exploitable
    // (pull funds from sourceAddress and stake for an arbitrary staker_address)
    function _stake(
        address staker_address,
        address sourceAddress,
        uint256 amount
    ) internal nonReentrant updateReward(staker_address) {
        require(
            (paused == false && migrationsOn == false) ||
                validMigrators[msg.sender] == true,
            'Staking is paused, or migration is happening'
        );
        require(amount > 0, 'Cannot stake 0');
        require(
            greylist[staker_address] == false,
            'address has been greylisted'
        );

        // Pull the tokens from the sourceAddress
        TransferHelper.safeTransferFrom(
            address(stakingToken),
            sourceAddress,
            address(this),
            amount
        );

        // Staking token supply and boosted supply
        _stakingTokenSupply = _stakingTokenSupply.add(amount);
        _stakingTokenBoostedSupply = _stakingTokenBoostedSupply.add(amount);

        // Staking token balance and boosted balance
        _unlockedBalances[staker_address] = _unlockedBalances[staker_address]
            .add(amount);
        _boostedBalances[staker_address] = _boostedBalances[staker_address].add(
            amount
        );

        emit Staked(staker_address, amount, sourceAddress);
    }

    // If this were not internal, and sourceAddress had an infinite approve, this could be exploitable
    // (pull funds from sourceAddress and stake for an arbitrary staker_address)
    function _stakeLocked(
        address staker_address,
        address sourceAddress,
        uint256 amount,
        uint256 secs
    ) internal nonReentrant updateReward(staker_address) {
        require(
            (paused == false && migrationsOn == false) ||
                validMigrators[msg.sender] == true,
            'Staking is paused, or migration is happening'
        );
        require(amount > 0, 'Cannot stake 0');
        require(secs > 0, 'Cannot wait for a negative number');
        require(
            greylist[staker_address] == false,
            'address has been greylisted'
        );
        require(
            secs >= lockedStakeMinTime,
            StringHelpers.strConcat(
                'Minimum stake time not met (',
                _lockedStakeMinTimeStr,
                ')'
            )
        );
        require(
            secs <= lockedStakeTimeForMaxMultiplier,
            'You are trying to stake for too long'
        );

        uint256 multiplier = stakingMultiplier(secs);
        uint256 boostedAmount = amount.mul(multiplier).div(_PRICE_PRECISION);
        _lockedStakes[staker_address].push(
            LockedStake(
                keccak256(
                    abi.encodePacked(staker_address, block.timestamp, amount)
                ),
                block.timestamp,
                amount,
                block.timestamp.add(secs),
                multiplier
            )
        );

        // Pull the tokens from the sourceAddress
        TransferHelper.safeTransferFrom(
            address(stakingToken),
            sourceAddress,
            address(this),
            amount
        );

        // Staking token supply and boosted supply
        _stakingTokenSupply = _stakingTokenSupply.add(amount);
        _stakingTokenBoostedSupply = _stakingTokenBoostedSupply.add(
            boostedAmount
        );

        // Staking token balance and boosted balance
        _lockedBalances[staker_address] = _lockedBalances[staker_address].add(
            amount
        );
        _boostedBalances[staker_address] = _boostedBalances[staker_address].add(
            boostedAmount
        );

        emit StakeLocked(staker_address, amount, secs, sourceAddress);
    }

    // No withdrawer == msg.sender check needed since this is only internally callable and the checks are done in the wrapper
    // functions like withdraw(), migrator_withdraw_unlocked() and migrator_withdraw_locked()
    function _withdraw(
        address staker_address,
        address destinationAddress,
        uint256 amount
    ) internal nonReentrant notWithdrawalsPaused updateReward(staker_address) {
        require(amount > 0, 'Cannot withdraw 0');

        // Staking token balance and boosted balance
        _unlockedBalances[staker_address] = _unlockedBalances[staker_address]
            .sub(amount);
        _boostedBalances[staker_address] = _boostedBalances[staker_address].sub(
            amount
        );

        // Staking token supply and boosted supply
        _stakingTokenSupply = _stakingTokenSupply.sub(amount);
        _stakingTokenBoostedSupply = _stakingTokenBoostedSupply.sub(amount);

        // Give the tokens to the destinationAddress
        stakingToken.safeTransfer(destinationAddress, amount);
        emit Withdrawn(staker_address, amount, destinationAddress);
    }

    // No withdrawer == msg.sender check needed since this is only internally callable and the checks are done in the wrapper
    // functions like withdraw(), migrator_withdraw_unlocked() and migrator_withdraw_locked()
    function _withdrawLocked(
        address staker_address,
        address destinationAddress,
        bytes32 kekId
    ) internal nonReentrant notWithdrawalsPaused updateReward(staker_address) {
        LockedStake memory thisStake;
        thisStake.amount = 0;
        uint256 theIndex;
        for (uint256 i = 0; i < _lockedStakes[staker_address].length; i++) {
            if (kekId == _lockedStakes[staker_address][i].kekId) {
                thisStake = _lockedStakes[staker_address][i];
                theIndex = i;
                break;
            }
        }
        require(thisStake.kekId == kekId, 'Stake not found');
        require(
            block.timestamp >= thisStake.endingTimestamp ||
                stakesUnlocked == true ||
                validMigrators[msg.sender] == true,
            'Stake is still locked!'
        );

        uint256 theAmount = thisStake.amount;
        uint256 boostedAmount =
            theAmount.mul(thisStake.multiplier).div(_PRICE_PRECISION);
        if (theAmount > 0) {
            // Staking token balance and boosted balance
            _lockedBalances[staker_address] = _lockedBalances[staker_address]
                .sub(theAmount);
            _boostedBalances[staker_address] = _boostedBalances[staker_address]
                .sub(boostedAmount);

            // Staking token supply and boosted supply
            _stakingTokenSupply = _stakingTokenSupply.sub(theAmount);
            _stakingTokenBoostedSupply = _stakingTokenBoostedSupply.sub(
                boostedAmount
            );

            // Remove the stake from the array
            delete _lockedStakes[staker_address][theIndex];

            // Give the tokens to the destinationAddress
            stakingToken.safeTransfer(destinationAddress, theAmount);

            emit WithdrawnLocked(
                staker_address,
                theAmount,
                kekId,
                destinationAddress
            );
        }
    }

    // No withdrawer == msg.sender check needed since this is only internally callable
    // This distinction is important for the migrator
    function _getReward(address rewardee, address destinationAddress)
        internal
        nonReentrant
        notRewardsCollectionPaused
        updateReward(rewardee)
    {
        uint256 reward0 = rewards0[rewardee];
        uint256 reward1 = rewards1[rewardee];
        if (reward0 > 0) {
            rewards0[rewardee] = 0;
            rewardsToken0.transfer(destinationAddress, reward0);
            emit RewardPaid(
                rewardee,
                reward0,
                address(rewardsToken0),
                destinationAddress
            );
        }
        // if (token1RewardsOn){
        if (reward1 > 0) {
            rewards1[rewardee] = 0;
            rewardsToken1.transfer(destinationAddress, reward1);
            emit RewardPaid(
                rewardee,
                reward1,
                address(rewardsToken1),
                destinationAddress
            );
        }
        // }
    }

    // If the period expired, renew it
    function _retroCatchUp() internal {
        // Failsafe check
        require(block.timestamp > periodFinish, 'Period has not expired yet!');

        // Ensure the provided reward amount is not more than the balance in the contract.
        // This keeps the reward rate in the right range, preventing overflows due to
        // very high values of rewardRate in the earned and rewardsPerToken functions;
        // Reward + leftover must be less than 2^256 / 10^18 to avoid overflow.
        uint256 num_periods_elapsed =
            uint256(block.timestamp.sub(periodFinish)) / rewardsDuration; // Floor division to the nearest period
        uint256 balance0 = rewardsToken0.balanceOf(address(this));
        uint256 balance1 = rewardsToken1.balanceOf(address(this));
        require(
            rewardRate0
                .mul(rewardsDuration)
                .mul(crBoostMultiplier())
                .mul(num_periods_elapsed + 1)
                .div(_PRICE_PRECISION) <= balance0,
            'Not enough ARTHX available for rewards!'
        );

        if (token1RewardsOn) {
            require(
                rewardRate1.mul(rewardsDuration).mul(num_periods_elapsed + 1) <=
                    balance1,
                'Not enough token1 available for rewards!'
            );
        }

        // uint256 old_lastUpdateTime = lastUpdateTime;
        // uint256 new_lastUpdateTime = block.timestamp;

        // lastUpdateTime = periodFinish;
        periodFinish = periodFinish.add(
            (num_periods_elapsed.add(1)).mul(rewardsDuration)
        );

        (uint256 reward0, uint256 reward1) = rewardPerToken();
        rewardPerTokenStored0 = reward0;
        rewardPerTokenStored1 = reward1;
        lastUpdateTime = lastTimeRewardApplicable();

        emit RewardsPeriodRenewed(address(stakingToken));
    }
}
