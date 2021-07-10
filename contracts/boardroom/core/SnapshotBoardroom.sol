// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import {Address} from '../../utils/Address.sol';
import {IERC20} from '../../ERC20/IERC20.sol';
import {IERC20Burnable} from '../../ERC20/IERC20Burnable.sol';
import {ITokenStore} from './ITokenStore.sol';
import {Math} from '../../utils/math/Math.sol';
import {Operator} from '../../access/Operator.sol';
import {ReentrancyGuard} from '../../utils/ReentrancyGuard.sol';
import {SafeERC20} from '../../ERC20/SafeERC20.sol';
import {SafeMath} from '../../utils/math/SafeMath.sol';

contract SnapshotBoardroom is ReentrancyGuard, Operator, ITokenStore {
    using SafeERC20 for IERC20;
    using Address for address;
    using SafeMath for uint256;

    /* ========== DATA STRUCTURES ========== */

    struct Boardseat {
        uint256 lastSnapshotIndex;
        uint256 rewardEarned;
    }

    struct BoardSnapshot {
        uint256 time;
        uint256 rewardReceived;
        uint256 rewardPerShare;
    }

    /* ========== STATE VARIABLES ========== */

    IERC20 public cash;
    address public token;

    bool public stakeEnabled = true;

    uint256 private _totalSupply;
    mapping(address => uint256) private _balances;
    mapping(address => Boardseat) public directors;
    BoardSnapshot[] public boardHistory;

    /* ========== CONSTRUCTOR ========== */

    constructor(IERC20 _cash, IERC20 _token) {
        cash = _cash;
        token = address(_token);

        BoardSnapshot memory genesisSnapshot = BoardSnapshot({
            time: block.number,
            rewardReceived: 0,
            rewardPerShare: 0
        });
        boardHistory.push(genesisSnapshot);
    }

    /* ========== Modifiers =============== */
    modifier directorExists {
        require(
            balanceOf(msg.sender) > 0,
            'Boardroom: The director does not exist'
        );
        _;
    }

    modifier ensureStakeIsEnabled() {
        require(stakeEnabled, 'Store: stake is disabled');
        _;
    }

    modifier updateReward(address director) {
        if (director != address(0)) {
            Boardseat memory seat = directors[director];
            seat.rewardEarned = earned(director);
            seat.lastSnapshotIndex = latestSnapshotIndex();
            directors[director] = seat;
        }
        _;
    }

    /* ========== VIEW FUNCTIONS ========== */

    // =========== Snapshot getters

    function totalSupply() public view override returns (uint256) {
        return _totalSupply;
    }

    function balanceOf(address account) public view override returns (uint256) {
        return _balances[account];
    }

    function latestSnapshotIndex() public view returns (uint256) {
        return boardHistory.length.sub(1);
    }

    function getLatestSnapshot() internal view returns (BoardSnapshot memory) {
        return boardHistory[latestSnapshotIndex()];
    }

    function getLastSnapshotIndexOf(address director)
        public
        view
        returns (uint256)
    {
        return directors[director].lastSnapshotIndex;
    }

    function getLastSnapshotOf(address director)
        internal
        view
        returns (BoardSnapshot memory)
    {
        return boardHistory[getLastSnapshotIndexOf(director)];
    }

    function rewardPerShare() public view returns (uint256) {
        return getLatestSnapshot().rewardPerShare;
    }

    function earned(address director) public view returns (uint256) {
        uint256 latestRPS = getLatestSnapshot().rewardPerShare;
        uint256 storedRPS = getLastSnapshotOf(director).rewardPerShare;

        return
            balanceOf(director).mul(latestRPS.sub(storedRPS)).div(1e18).add(
                directors[director].rewardEarned
            );
    }

    /* ========== MUTATIVE FUNCTIONS ========== */
    function toggleStakeEnabled(bool flag) public onlyOwner {
        stakeEnabled = flag;
        emit StakeEnableChanged(flag, !flag);
    }

    // gov
    function setToken(address newToken) public onlyOwner {
        address oldToken = token;
        token = newToken;
        emit TokenChanged(msg.sender, oldToken, newToken);
    }

    function stakeFor(uint256 amount, address who) public onlyOwner {
        _stake(amount, who);
    }

    function stakeForMultiple(uint256[] memory amount, address[] memory who)
        public
        onlyOwner
    {
        for (uint256 index = 0; index < amount.length; index++) {
            _stake(amount[index], who[index]);
        }
    }

    function withdraw(uint256 amount, address who) public onlyOwner {
        _withdraw(amount, who);
    }

    // logic
    function _stake(uint256 amount, address who)
        internal
        virtual
        ensureStakeIsEnabled
        updateReward(who)
    {
        require(amount > 0, 'Boardroom: Cannot stake 0');

        _totalSupply = _totalSupply.add(amount);
        _balances[who] = _balances[who].add(amount);
        IERC20Burnable(token).burnFrom(who, amount);
        emit Staked(who, amount);
    }

    function _withdraw(uint256 amount, address who)
        internal
        virtual
        ensureStakeIsEnabled
        updateReward(who)
    {
        uint256 balance = _balances[who];
        require(
            balance >= amount,
            'Boardroom: withdraw request greater than staked amount'
        );
        _totalSupply = _totalSupply.sub(amount);
        _balances[who] = balance.sub(amount);
        IERC20(token).safeTransfer(who, amount);
    }

    function claimReward() public updateReward(msg.sender) {
        uint256 reward = directors[msg.sender].rewardEarned;
        if (reward > 0) {
            directors[msg.sender].rewardEarned = 0;
            cash.safeTransfer(msg.sender, reward);
            emit RewardPaid(msg.sender, reward);
        }
    }

    function allocateSeigniorage(uint256 amount) external onlyOperator {
        require(amount > 0, 'Boardroom: Cannot allocate 0');
        require(
            totalSupply() > 0,
            'Boardroom: Cannot allocate when totalSupply is 0'
        );

        // Create & add new snapshot
        uint256 prevRPS = getLatestSnapshot().rewardPerShare;
        uint256 nextRPS = prevRPS.add(amount.mul(1e18).div(totalSupply()));

        BoardSnapshot memory newSnapshot = BoardSnapshot({
            time: block.number,
            rewardReceived: amount,
            rewardPerShare: nextRPS
        });
        boardHistory.push(newSnapshot);

        cash.safeTransferFrom(msg.sender, address(this), amount);
        emit RewardAdded(msg.sender, amount);
    }

    event Staked(address indexed user, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount);
    event RewardPaid(address indexed user, uint256 reward);
    event RewardAdded(address indexed user, uint256 reward);
    event StakeEnableChanged(bool newFlag, bool oldFlag);
    event TokenChanged(
        address indexed operator,
        address oldToken,
        address newToken
    );
}
