// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import '@openzeppelin/contracts/contracts/access/Ownable.sol';

import './ISimpleOracle.sol';

contract SimpleOracle is Ownable, ISimpleOracle {
    /**
     * State variables.
     */
    string public name;
    uint256 public price = 1e18;

    /**
     * Constructor.
     */
    constructor(string memory _name, uint256 _price) {
        name = _name;

        // Set the initial price.
        price = _price;
    }

    /**
     * Views.
     */
    function getPrice() public view override returns (uint256) {
        return price;
    }

    /**
     * Settes.
     */
    function setPrice(uint256 _price) public onlyOwner {
        require(_price >= 0, 'Oracle: price cannot be < 0');

        price = _price;
    }
}
