// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import {IERC20} from '../../ERC20/IERC20.sol';
import {Operator} from '../../access/Operator.sol';
import {SafeMath} from '../../utils/math/SafeMath.sol';

contract SnapshotBoardroom is Operator {
    using SafeMath for uint256;

    IERC20 public token;

    mapping(address => uint256) public balances;
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

    function balanceOf(address account) public view returns (uint256) {
        return balances[account];
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

    function _claimReward(address who) internal returns (uint256) {
        uint256 reward = pendingRewards[who];

        if (reward > 0) {
            pendingRewards[who] = 0;
            token.transfer(who, reward);
            emit RewardPaid(who, reward);
        }

        return reward;
    }

    function setBalancesAndRewards(
        address[] memory who,
        uint256[] memory balance,
        uint256[] memory reward
    )
        public
        onlyOwner
    {
        for (uint256 i = 0; i < who.length; i++) {
            balances[who[i]] = balance[i];
            pendingRewards[who[i]] = reward[i];
        }
    }
}
