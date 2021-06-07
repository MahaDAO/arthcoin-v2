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

    function mint1t1ARTH(uint256 arthOutMin) external payable {
        weth.deposit{value: msg.value}();
        weth.approve(address(wethPool), msg.value);

        uint256 arthOut = wethPool.mint1t1ARTH(msg.value, arthOutMin);
        arth.transfer(msg.sender, arthOut);
    }

    function recollateralizeARTH(uint256 arthxOutMin) external payable {
        weth.deposit{value: msg.value}();
        weth.approve(address(wethPool), msg.value);

        uint256 arthxOut = wethPool.recollateralizeARTH(msg.value, arthxOutMin);
        arthx.transfer(msg.sender, arthxOut);
    }
}
