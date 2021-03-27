// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

interface ICommonStaking {
    function getReward() external;

    function stake(uint256 amount) external;

    function withdraw(uint256 amount) external;

    function withdrawLocked(bytes32 kek_id) external;

    function stakeFor(address who, uint256 amount) external;

    function stakeLocked(uint256 amount, uint256 secs) external;

    function onTokenMint(address who, uint256 amount) external returns (bool);
}
