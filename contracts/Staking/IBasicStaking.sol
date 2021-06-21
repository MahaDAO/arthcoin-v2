// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

interface IBasicStaking {
    function balanceOf(address account) external view returns (uint256);

    function earned(address account) external view returns (uint256);

    function exit() external;

    function getReward() external;

    function getRewardForDuration() external view returns (uint256);

    function lastTimeRewardApplicable() external view returns (uint256);

    function rewardPerToken() external view returns (uint256);

    function rewardsDistribution() external view returns (address);

    function rewardsToken() external view returns (address);

    function stake(uint256 amount) external;

    function totalSupply() external view returns (uint256);

    function withdraw(uint256 amount) external;
}
