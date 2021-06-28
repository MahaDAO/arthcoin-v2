// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import {Ownable} from '../access/Ownable.sol';
import {SafeMath} from '../utils/math/SafeMath.sol';
import {ITaxController} from './ITaxController.sol';
import {IERC20Burnable} from '../ERC20/IERC20Burnable.sol';

contract TxPausingTaxController is Ownable, ITaxController {
    using SafeMath for uint256;

    constructor() {}

    function chargeTax() external pure override {
        // Should pause tx for non tax whitelisted entities of arthx
        revert('Tx are paused');
        require(false, 'Tx are paused');
    }
}
