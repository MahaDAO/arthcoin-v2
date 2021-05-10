// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;
import {IERC20} from '../ERC20/IERC20.sol';
import {SafeMath} from '../utils/math/SafeMath.sol';

contract Faucet {
    using SafeMath for uint256;

    function mint(
        IERC20 _tokenAddres,
        address _to,
        uint256 _amount
    ) public {
        _tokenAddres.transferFrom(address(this), _to, _amount);
    }
}
