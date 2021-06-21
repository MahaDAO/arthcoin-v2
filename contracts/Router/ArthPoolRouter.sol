// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import {IARTH} from '../Arth/IARTH.sol';
import {IARTHPool} from '../Arth/Pools/IARTHPool.sol';
import {IARTHX} from '../ARTHX/IARTHX.sol';
import {IERC20} from '../ERC20/IERC20.sol';
import {IWETH} from '../ERC20/IWETH.sol';
import {IOracle} from '../Oracle/IOracle.sol';
import {IBoostedStaking} from '../Staking/IBoostedStaking.sol';
import {IUniswapV2Router02} from '../Uniswap/Interfaces/IUniswapV2Router02.sol';

contract ArthPoolRouter {
    IARTH public arth;
    IARTHX public arthx;
    IWETH public weth;
    IUniswapV2Router02 public router;

    constructor(
        IARTHX _arthx,
        IARTH _arth,
        IWETH _weth,
        IUniswapV2Router02 _router
    ) {
        arth = _arth;
        arthx = _arthx;
        weth = _weth;
        router = _router;
    }

    function mintAndStake(
        IARTHPool pool,
        IERC20 collateral,
        uint256 amount,
        uint256 arthOutMin,
        uint256 arthxOutMin,
        uint256 secs,
        IBoostedStaking stakingPool
    ) external {
        _mintAndStake(
            pool,
            collateral,
            amount,
            arthOutMin,
            arthxOutMin,
            secs,
            stakingPool
        );
    }

    function mintAndStakeWithETH(
        IARTHPool pool,
        uint256 arthOutMin,
        uint256 arthxOutMin,
        uint256 secs,
        IBoostedStaking stakingPool
    ) external payable {
        weth.deposit{value: msg.value}();
        _mintAndStake(
            pool,
            weth,
            msg.value,
            arthOutMin,
            arthxOutMin,
            secs,
            stakingPool
        );
    }

    function _mintAndStake(
        IARTHPool pool,
        IERC20 collateral,
        uint256 amount,
        uint256 arthOutMin,
        uint256 arthxOutMin,
        uint256 secs,
        IBoostedStaking stakingPool
    ) internal {
        if (address(collateral) != address(weth)) {
            collateral.transferFrom(msg.sender, address(this), amount);
        }
        collateral.approve(address(pool), amount);

        (uint256 arthOut, uint256 arthxOut) =
            pool.mint(amount, arthOutMin, arthxOutMin);
        arth.approve(address(stakingPool), uint256(arthOut));
        arthx.transfer(msg.sender, arthxOut);

        if (address(stakingPool) != address(0)) {
            if (secs != 0)
                stakingPool.stakeLockedFor(
                    msg.sender,
                    address(this),
                    arthOut,
                    secs
                );
            else stakingPool.stakeFor(msg.sender, address(this), arthOut);
        }
    }

    function mintWithETH(
        IARTHPool pool,
        uint256 arthOutMin,
        uint256 arthxOutMin
    ) public payable {
        weth.deposit{value: msg.value}();
        _mint(pool, weth, msg.value, arthOutMin, arthxOutMin);
    }

    function mint(
        IARTHPool pool,
        IERC20 collateral,
        uint256 amount,
        uint256 arthOutMin,
        uint256 arthxOutMin
    ) public {
        _mint(pool, collateral, amount, arthOutMin, arthxOutMin);
    }

    function _mint(
        IARTHPool pool,
        IERC20 collateral,
        uint256 amount,
        uint256 arthOutMin,
        uint256 arthxOutMin
    ) internal {
        if (address(collateral) != address(weth)) {
            collateral.transferFrom(msg.sender, address(this), amount);
        }

        collateral.approve(address(pool), amount);

        (uint256 arthOut, uint256 arthxOut) =
            pool.mint(amount, arthOutMin, arthxOutMin);

        arth.transfer(msg.sender, arthOut);
        arthx.transfer(msg.sender, arthxOut);
    }

    function _swapForARTHX(
        IERC20 tokenToSell,
        uint256 amountToSell,
        address to,
        uint256 minAmountToRecieve
    ) internal {
        address[] memory path = new address[](2);
        path[0] = address(tokenToSell);
        path[1] = address(arthx);

        tokenToSell.transferFrom(msg.sender, address(this), amountToSell);
        tokenToSell.approve(address(router), amountToSell);

        router.swapExactTokensForTokens(
            amountToSell,
            minAmountToRecieve,
            path,
            to,
            block.timestamp
        );
    }
}
