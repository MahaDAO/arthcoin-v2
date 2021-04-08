// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;
pragma experimental ABIEncoderV2;

import '../Oracle/ChainlinkETHUSDPriceConsumer.sol';
import '../Math/SafeMath.sol';

contract BondingCurve {
    using SafeMath for uint256;

    function _getGenesisPrice(uint256 _ethRaised, uint256 hardcap)
        public
        pure
        returns (uint256)
    {
        uint256 genesisPrice;
        uint256 ethRaised = _ethRaised.mul(100).div(hardcap);
        genesisPrice = _curve(ethRaised);

        return genesisPrice;
    }

    // _startingPrice = 0.5
    function _curve(uint256 _percent) public pure returns (uint256) {
        uint256 price =
            (uint256(5).div(10)).add(
                (5**_percent).sub(1).div(5).mul(uint256(85).div(100))
            );

        return price;
    }
}
