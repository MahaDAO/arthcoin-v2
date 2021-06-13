// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import {IARTH} from '../Arth/IARTH.sol';
import {IARTHPool} from '../Arth/Pools/IARTHPool.sol';
import {IARTHX} from '../ARTHX/IARTHX.sol';
import {IWETH} from '../ERC20/IWETH.sol';

contract ARTHPoolWETHRouter {
    IARTH public arth;
    IWETH public weth;
    IARTHX public arthx;
    IARTHPool public wethPool;

    constructor(
        IWETH weth_,
        IARTH arth_,
        IARTHX arthx_,
        IARTHPool wethPool_
    ) {
        arth = arth_;
        weth = weth_;
        arthx = arthx_;
        wethPool = wethPool_;
    }

    function mint(uint256 arthOutMin, uint256 arthxOutMin) external payable {
        weth.deposit{value: msg.value}();
        weth.approve(address(wethPool), msg.value);

        (uint256 arthOut, uint256 arthxOut) = wethPool.mint(msg.value, arthOutMin, arthxOutMin);
        arth.transfer(msg.sender, arthOut);
        arthx.transfer(msg.sender, arthxOut);
    }

    function recollateralizeARTH(uint256 arthxOutMin) external payable {
        weth.deposit{value: msg.value}();
        weth.approve(address(wethPool), msg.value);

        uint256 arthxOut = wethPool.recollateralizeARTH(msg.value, arthxOutMin);
        arthx.transfer(msg.sender, arthxOut);
    }
}
