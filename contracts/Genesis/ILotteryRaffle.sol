// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

interface ILotteryRaffle {
    function rewardLottery(address _to, uint256 _amount) external;

    function getTokenCounts() external view returns (uint256);

    function tokenIdOwner(uint256 id) external view returns (address);

    function usersLottery(address _address) external view returns(uint256);
}
