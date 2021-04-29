// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

interface IOracle {
    function getPairWETHPrice() external view returns(uint256);

    function getETHGMUPrice() external view returns(uint256);

    function getPairPrice() external view returns(uint256);

    function getChainlinkPrice() external view returns(uint256);

    function getPrice() external view returns(uint256);
}
