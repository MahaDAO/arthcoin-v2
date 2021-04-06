// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;
pragma experimental ABIEncoderV2;

import './Owned.sol';
import './Pausable.sol';
import '../Arth/Arth.sol';
import '../Math/Math.sol';
import '../ERC20/ERC20.sol';
import '../Math/SafeMath.sol';
import './IStakingRewards.sol';
import '../ERC20/SafeERC20.sol';
import '../Utils/StringHelpers.sol';
import '../Uniswap/UniswapV2Pair.sol';
import '../Utils/ReentrancyGuard.sol';
import '../Uniswap/TransferHelper.sol';
import './RewardsDistributionRecipient.sol';
import './IStakingRewardsDualForMigrator.sol';
import '../Uniswap/Interfaces/IUniswapV2Router02.sol';

/**
 *  Original code written by:
 *  - Travis Moore, Jason Huan, Same Kazemian, Sam Sun.
 *  Code modified by:
 *  - Steven Enamakel, Yash Agrawal & Sagar Behara.
 */
contract UniLPToSushiLPMigrator is
    IStakingRewards,
    RewardsDistributionRecipient,
    ReentrancyGuard,
    Pausable
{
    using SafeMath for uint256;
    using SafeERC20 for ERC20;

    /* ========== DUPLICATE VARIABLES (NEEDED FOR DELEGATECALL) ========== */

    ARTHStablecoin private ARTH;
    ERC20 public rewardsToken;
    ERC20 public stakingToken;
    uint256 public periodFinish;

    // Constant for various precisions
    uint256 private constant PRICE_PRECISION = 1e6;
    uint256 private constant MULTIPLIER_BASE = 1e6;

    // Max reward per second
    uint256 public rewardRate;

    // uint256 public rewardsDuration = 86400 hours;
    uint256 public rewardsDuration = 604800; // 7 * 86400  (7 days)

    uint256 public lastUpdateTime;
    uint256 public rewardPerTokenStored = 0;
    uint256 public pool_weight; // This staking pool's percentage of the total ARTHX being distributed by all pools, 6 decimals of precision

    address public ownerAddress;
    address public timelock_address; // Governance timelock address

    uint256 public locked_stake_max_multiplier = 3000000; // 6 decimals of precision. 1x = 1000000
    uint256 public locked_stake_time_for_max_multiplier = 3 * 365 * 86400; // 3 years
    uint256 public locked_stake_min_time = 604800; // 7 * 86400  (7 days)
    string private locked_stake_min_time_str = '604800'; // 7 days on genesis

    uint256 public cr_boost_max_multiplier = 3000000; // 6 decimals of precision. 1x = 1000000

    mapping(address => uint256) public userRewardPerTokenPaid;
    mapping(address => uint256) public rewards;

    uint256 private _staking_token_supply = 0;
    uint256 private _staking_token_boosted_supply = 0;
    mapping(address => uint256) private _unlocked_balances;
    mapping(address => uint256) private _locked_balances;
    mapping(address => uint256) private _boosted_balances;

    mapping(address => IStakingRewardsDualForMigrator.ILockedStake[])
        private lockedStakes;

    mapping(address => bool) public greylist;

    bool public unlockedStakes; // Release lock stakes in case of system migration

    /* ========== STATE VARIABLES ========== */

    // ARTHStablecoin private ARTH;
    IStakingRewardsDualForMigrator public SourceStakingContract;
    IStakingRewardsDualForMigrator public DestStakingContract;
    UniswapV2Pair public SourceLPPair;
    UniswapV2Pair public DestLPPair;

    // address public ownerAddress;
    // address public timelock_address; // Governance timelock address
    address payable public constant UNISWAP_ROUTER_ADDRESS =
        payable(0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D);
    address payable public constant SUSHISWAP_ROUTER_ADDRESS =
        payable(0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F);
    address public source_staking_contract_addr;
    address public source_lp_pair_addr;
    address public dest_staking_contract_addr;
    address public dest_lp_pair_addr;

    IUniswapV2Router02 internal constant UniswapRouter =
        IUniswapV2Router02(UNISWAP_ROUTER_ADDRESS);
    IUniswapV2Router02 internal constant SushiSwapRouter =
        IUniswapV2Router02(SUSHISWAP_ROUTER_ADDRESS);

    uint256 public ADD_LIQUIDITY_SLIPPAGE = 950; // will be .div(1000)

    /* ========== CONSTRUCTOR ========== */

    constructor(
        address _owner,
        address _source_staking_contract_addr,
        address _dest_staking_contract_addr
    ) Owned(_owner) {
        ownerAddress = _owner;
        source_staking_contract_addr = _source_staking_contract_addr;
        dest_staking_contract_addr = _dest_staking_contract_addr;

        SourceStakingContract = IStakingRewardsDualForMigrator(
            source_staking_contract_addr
        );
        DestStakingContract = IStakingRewardsDualForMigrator(
            dest_staking_contract_addr
        );

        source_lp_pair_addr = address(SourceStakingContract.stakingToken());
        dest_lp_pair_addr = address(DestStakingContract.stakingToken());

        SourceLPPair = UniswapV2Pair(source_lp_pair_addr);
        DestLPPair = UniswapV2Pair(dest_lp_pair_addr);
    }

    /* ========== VIEWS ========== */

    /* ========== MUTATIVE FUNCTIONS ========== */

    function delegatecall_stake() external {
        // (bool success, bytes memory result) = address(SourceStakingContract).delegatecall(
        //     abi.encodeWithSignature("stake(uint256)", 1e18)
        // );
        (bool success, bytes memory result) =
            address(SourceStakingContract).delegatecall(
                abi.encode(
                    bytes4(keccak256('stake(uint256)')),
                    1000000000000000000
                )
            );

        if (!success) {
            if (result.length > 0) {
                revert(string(result));
            } else {
                revert();
            }
        }
        require(success, 'delegatecall_stake failed');
    }

    function delegatecall_getReward() external {
        (bool success, bytes memory result) =
            address(SourceStakingContract).delegatecall(
                abi.encodeWithSignature('getReward()')
            );
        if (!success) {
            if (result.length > 0) {
                revert(string(result));
            } else {
                revert();
            }
        }
        require(success, 'delegatecall_getReward failed');
    }

    function normal_getReward() external {
        SourceStakingContract.getReward();
    }

    function migrate_unlocked() external {}

    function migrate_one_locked(bytes32 kek_id) external {}

    function migrate_all_locked() external {
        // Unlock the stakes
        SourceStakingContract.unlockStakes();

        // Loop through the locked stakes
        IStakingRewardsDualForMigrator.ILockedStake[] memory locked_stakes =
            SourceStakingContract.lockedStakesOf(msg.sender);
        for (uint256 i = 0; i < locked_stakes.length; i++) {
            // Withdraw the locked Uni LP tokens [delegatecall]
            // ----------------------------------------------------------
            {
                (bool success, bytes memory result) =
                    address(SourceStakingContract).delegatecall(
                        abi.encodeWithSignature(
                            'withdrawLocked(bytes32)',
                            locked_stakes[i].kek_id
                        )
                    );
                if (!success) {
                    if (result.length > 0) {
                        revert(string(result));
                    } else {
                        revert();
                    }
                }
                require(success, 'Uni withdrawLocked failed');
            }

            // Approve Uni LP for Uniswap removeLiquidity [delegatecall]
            // ----------------------------------------------------------
            {
                (bool success, ) =
                    address(SourceLPPair).delegatecall(
                        abi.encodeWithSignature(
                            'approve(address,uint256)',
                            UNISWAP_ROUTER_ADDRESS,
                            locked_stakes[i].amount
                        )
                    );
                require(success, 'Approve Uni LP for Uniswap failed');
            }

            // Remove the liquidity from Uni [delegatecall]
            // ----------------------------------------------------------
            uint256 token0_returned;
            uint256 token1_returned;
            {
                (bool success, bytes memory data) =
                    address(UniswapRouter).delegatecall(
                        abi.encodeWithSignature(
                            'removeLiquidity(address,address,uint,uint,uint,address,uint)',
                            SourceLPPair.token0(),
                            SourceLPPair.token1(),
                            locked_stakes[i].amount,
                            0,
                            0,
                            msg.sender,
                            2105300114
                        )
                    );
                require(success, 'UniswapRouter removeLiquidity failed');
                (token0_returned, token1_returned) = abi.decode(
                    data,
                    (uint256, uint256)
                );
            }

            // Approve token0 for Sushi addLiquidity [delegatecall]
            // ----------------------------------------------------------
            {
                (bool success, ) =
                    address(SourceLPPair.token0()).delegatecall(
                        abi.encodeWithSignature(
                            'approve(address,uint256)',
                            SUSHISWAP_ROUTER_ADDRESS,
                            token0_returned
                        )
                    );
                require(
                    success,
                    'Approve token0 for Sushi addLiquidity failed'
                );
            }

            // Approve token1 for Sushi addLiquidity [delegatecall]
            // ----------------------------------------------------------
            {
                (bool success, ) =
                    address(SourceLPPair.token1()).delegatecall(
                        abi.encodeWithSignature(
                            'approve(address,uint256)',
                            SUSHISWAP_ROUTER_ADDRESS,
                            token1_returned
                        )
                    );
                require(
                    success,
                    'Approve token1 for Sushi addLiquidity failed'
                );
            }

            // Add liquidity to Sushi [delegatecall]
            // ----------------------------------------------------------
            uint256 slp_returned;
            {
                (bool success, bytes memory data) =
                    address(SushiSwapRouter).delegatecall(
                        abi.encodeWithSignature(
                            'addLiquidity(address,address,uint,uint,uint,uint,address,uint)',
                            SourceLPPair.token0(),
                            SourceLPPair.token1(),
                            token0_returned,
                            token1_returned,
                            token0_returned.mul(ADD_LIQUIDITY_SLIPPAGE).div(
                                1000
                            ),
                            token1_returned.mul(ADD_LIQUIDITY_SLIPPAGE).div(
                                1000
                            ),
                            msg.sender,
                            2105300114 // A long time from now
                        )
                    );
                require(success, 'SushiSwapRouter addLiquidity failed');
                (, , slp_returned) = abi.decode(
                    data,
                    (uint256, uint256, uint256)
                );
            }

            // Add a locked stake [delegatecall]
            // ----------------------------------------------------------
            {
                (
                    bool success, /* bytes memory data */

                ) =
                    address(DestStakingContract).delegatecall(
                        abi.encodeWithSignature(
                            'stakeLocked(uint,uint)',
                            slp_returned,
                            (locked_stakes[i].ending_timestamp).sub(
                                block.timestamp
                            )
                        )
                    );
                require(success, 'Sushi stakeLocked failed');
            }
        }

        // Re-Lock the stakes
        // ----------------------------------------------------------
        SourceStakingContract.unlockStakes();

        emit Migrated(
            msg.sender,
            source_staking_contract_addr,
            dest_staking_contract_addr
        );
    }

    /* ========== RESTRICTED FUNCTIONS ========== */

    // Added to support recovering LP Rewards and other mistaken tokens from other systems to be distributed to holders
    function recoverERC20(address tokenAddress, uint256 tokenAmount)
        external
        onlyByOwnerOrGovernance
    {
        ERC20(tokenAddress).transfer(ownerAddress, tokenAmount);
        emit Recovered(tokenAddress, tokenAmount);
    }

    function setOwnerAndTimelock(address _new_owner, address _new_timelock)
        external
        onlyByOwnerOrGovernance
    {
        ownerAddress = _new_owner;
        timelock_address = _new_timelock;
    }

    /* ========== NEEDED FOR DELEGATECALL ========== */

    function lastTimeRewardApplicable()
        external
        pure
        override
        returns (uint256)
    {
        return 0;
    }

    function rewardPerToken() external pure override returns (uint256) {
        return 0;
    }

    function earned(address account) external pure override returns (uint256) {
        return 0;
    }

    function getRewardForDuration() external pure override returns (uint256) {
        return 0;
    }

    function totalSupply() external pure override returns (uint256) {
        return 0;
    }

    function balanceOf(address account)
        external
        pure
        override
        returns (uint256)
    {
        return 0;
    }

    // Mutative

    function stake(uint256 amount) external override {}

    function withdraw(uint256 amount) external override {}

    function getReward() external override {}

    /* ========== MODIFIERS ========== */

    modifier onlyByOwnerOrGovernance() {
        require(
            msg.sender == ownerAddress || msg.sender == timelock_address,
            'You are not the owner or the governance timelock'
        );
        _;
    }

    /* ========== EVENTS ========== */

    event Recovered(address token, uint256 amount);
    event Migrated(
        address indexed user,
        address source_addr,
        address dest_addr
    );
}
