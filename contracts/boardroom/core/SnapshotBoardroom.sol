// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import {IERC20} from '../../ERC20/IERC20.sol';
import {Operator} from '../../access/Operator.sol';
import {SafeMath} from '../../utils/math/SafeMath.sol';

contract SnapshotBoardroom is Operator {
    using SafeMath for uint256;

    struct Boardseat {
        uint256 rewardClaimed;
        uint256 lastRPS;
        uint256 firstRPS;
        uint256 lastBoardSnapshotIndex;
        // // Pending reward from the previous epochs.
        // uint256 rewardPending;
        // Total reward earned in this epoch.
        uint256 rewardEarnedCurrEpoch;
        // Last time reward was claimed(not bound by current epoch).
        uint256 lastClaimedOn;
        // // The reward claimed in vesting period of this epoch.
        // uint256 rewardClaimedCurrEpoch;
        // // Snapshot of boardroom state when last epoch claimed.
        uint256 lastSnapshotIndex;
        // // Rewards claimable now in the current/next claim.
        // uint256 rewardClaimableNow;
        // // keep track of the current rps
        // uint256 claimedRPS;
        bool isFirstVaultActivityBeforeFirstEpoch;
        uint256 firstEpochWhenDoingVaultActivity;
    }

    IERC20 public token;
    Boardseat private dummySeat;

    mapping(address => uint256) public pendingRewards;

    event RewardPaid(address indexed user, uint256 reward);
    event RewardAdded(address indexed user, uint256 reward);

    constructor(IERC20 token_, address operator) {
        token = token_;
        transferOperator(operator);
    }

    function earned(address director)
        public
        view
        virtual
        returns (uint256)
    {
        return pendingRewards[director];
    }

    function claimReward() public virtual returns (uint256) {
        return _claimReward(msg.sender);
    }

    function allocateSeigniorage(uint256 amount)
        external
        onlyOperator
    {
        require(amount > 0, 'Boardroom: Cannot allocate 0');
        token.transferFrom(msg.sender, address(this), amount);
        emit RewardAdded(msg.sender, amount);
    }

    function updateReward(address director) external virtual {}

    function _claimReward(address who) internal returns (uint256) {
        uint256 reward = pendingRewards[who];

        if (reward > 0) {
            pendingRewards[who] = 0;
            token.transfer(who, reward);
            emit RewardPaid(who, reward);
        }

        return reward;
    }

    function setBalances(address[] memory who, uint256[] memory amt)
        public
        onlyOwner
    {
        for (uint256 i = 0; i < who.length; i++) {
            pendingRewards[who[i]] = amt[i];
        }
    }

    function getDirector(address who)
        external
        view
        returns (Boardseat memory)
    {
        require(who != address(0));
        return dummySeat;
    }

    function getLastSnapshotIndexOf(address who)
        external
        view
        returns (uint256)
    {
        return pendingRewards[who];
    }
}
