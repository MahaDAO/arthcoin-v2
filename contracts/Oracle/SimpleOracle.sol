// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import {SafeMath} from '@openzeppelin/contracts/contracts/math/SafeMath.sol';
import '@openzeppelin/contracts/contracts/access/Ownable.sol';

import './ISimpleOracle.sol';

contract SimpleOracle is Ownable, ISimpleOracle {
    using SafeMath for uint256;

    string public name;
    uint256 public price = 1e18;

    constructor(string memory _name, uint256 _price) {
        name = _name;

        // Set the initial price to 1e18 i.e 1.
        price = _price;
    }

    function setPrice(uint256 _price) public onlyOwner {
        require(_price >= 0, 'Oracle: price cannot be < 0');

        price = _price;
    }

    function getPrice() public view override returns (uint256) {
        return price;
    }

    event Updated(uint256 price0CumulativeLast, uint256 price1CumulativeLast);
}
