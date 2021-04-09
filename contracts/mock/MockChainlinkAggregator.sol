// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

contract MockChainlinkAggregator {
    uint256 latestPrice = 1e8;

    function decimals() external pure returns (uint8) {
        return 8;
    }

    function description() external pure returns (string memory) {
        return 'This is a mock chainlink oracle';
    }

    function version() external pure returns (uint256) {
        return 3;
    }

    function setLatestPrice(uint256 price) public {
        latestPrice = price;
    }

    function getRoundData(uint80 _roundId)
        external
        view
        returns (
            uint80 roundId,
            int256 answer,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        )
    {
        return (_roundId, int256(latestPrice), 1, 1, 1);
    }

    function latestRoundData()
        external
        view
        returns (
            uint80 roundId,
            int256 answer,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        )
    {
        return (1, int256(latestPrice), 1, 1, 1);
    }
}
