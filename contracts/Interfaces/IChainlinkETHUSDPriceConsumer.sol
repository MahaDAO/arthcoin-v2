// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

interface IChainlinkETHUSDPriceConsumer {
    function getGmuPrice() external;

    function getLatestUSDPrice() external;

    function getLatestPrice() external;

    function getDecimals() external;
}
