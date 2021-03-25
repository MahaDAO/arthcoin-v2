// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import {SafeMath} from '@openzeppelin/contracts/contracts/math/SafeMath.sol';
import '@openzeppelin/contracts/contracts/access/Ownable.sol';

import './ISimpleOracle.sol';

contract GMUOracale is Ownable {
    using SafeMath for uint256;

    uint256 public gmu = 1e18;

    constructor(uint256 _gmu) {
        gmu = _gmu;
    }

    function setGMU(uint256 _gmu) public onlyOwner {
        require(_gmu >= 0, 'Oracle: price cannot be < 0');

        gmu = _gmu;
    }

    function getGMU() public view returns (uint256) {
        return gmu;
    }

    event Updated(uint256 GMU);
}
