// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import {IARTH} from '../Arth/IARTH.sol';
import {IARTHPool} from '../Arth/Pools/IARTHPool.sol';
import {IARTHX} from '../ARTHX/IARTHX.sol';
import {IERC20} from '../ERC20/IERC20.sol';
import {IWETH} from '../ERC20/IWETH.sol';
import {ISimpleOracle} from '../Oracle/ISimpleOracle.sol';
import {IBoostedStaking} from '../Staking/IBoostedStaking.sol';
import {IUniswapV2Router02} from '../Uniswap/Interfaces/IUniswapV2Router02.sol';

contract ARTHPoolWETHRouter {
    IARTH public arth;
    IWETH public weth;
    IARTHX public arthx;
    IARTHPool public wethPool;
    IUniswapV2Router02 public router;

    constructor(
        IWETH weth_,
        IARTH arth_,
        IARTHX arthx_,
        IARTHPool wethPool_,
        IUniswapV2Router02 router_
    ) {
        arth = arth_;
        weth = weth_;
        arthx = arthx_;
        router = router_;
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
