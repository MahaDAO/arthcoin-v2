// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import {Ownable} from '../access/Ownable.sol';
import {SafeMath} from './math/SafeMath.sol';
import {IERC20} from '../ERC20/IERC20.sol';

contract MultiSender is Ownable {
    using SafeMath for uint256;

    function ethSendDifferentValue(
        address payable[] memory _to,
        uint256[] memory _value
    ) internal {
        uint256 remainingValue = msg.value;

        require(_to.length == _value.length);
        require(_to.length <= 255);

        for (uint8 i = 0; i < _to.length; i++) {
            remainingValue = remainingValue.sub(_value[i]);
            require(_to[i].send(_value[i]));
        }
    }

    function coinSendDifferentValue(
        address _tokenAddress,
        address[] memory _to,
        uint256[] memory _value
    ) internal {
        require(_to.length == _value.length);
        require(_to.length <= 255);

        IERC20 token = IERC20(_tokenAddress);

        for (uint8 i = 0; i < _to.length; i++) {
            token.transferFrom(msg.sender, _to[i], _value[i]);
        }
    }

    function multiSendETHWithDifferentValue(
        address payable[] memory _to,
        uint256[] memory _value
    ) public payable {
        ethSendDifferentValue(_to, _value);
    }

    function multiSendCoinWithDifferentValue(
        address _tokenAddress,
        address[] memory _to,
        uint256[] memory _value
    ) public payable {
        coinSendDifferentValue(_tokenAddress, _to, _value);
    }
}
