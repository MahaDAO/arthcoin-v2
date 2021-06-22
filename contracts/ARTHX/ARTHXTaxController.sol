// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import {IERC20Burnable} from '../ERC20/IERC20Burnable.sol';
import {Ownable} from '../access/Ownable.sol';
import {SafeMath} from '../utils/math/SafeMath.sol';
import {ITaxController} from './ITaxController.sol';
import {IUniswapV2Factory} from '../Uniswap/Interfaces/IUniswapV2Factory.sol';
import {IUniswapV2Router02} from '../Uniswap/Interfaces/IUniswapV2Router02.sol';

contract ARTHXTaxController is Ownable, ITaxController {
    using SafeMath for uint256;

    IERC20Burnable public immutable arthx;
    IUniswapV2Router02 public immutable router;

    uint256 public taxPercentToBurn = 50e4; // In 6 precision.
    uint256 public taxPercentToRewards = 25e4; // In 6 precision.
    uint256 public taxPercentToLiquidity = 25e4; // In 6 precision.

    address public rewardsDestination;

    event TaxCharged(address from, address to, uint256 amount);

    constructor(IERC20Burnable token, IUniswapV2Router02 swapRouter) {
        arthx = token;
        router = swapRouter;
    }

    /// @dev To recieve ETH from uniswap router when swaping.
    receive() external payable {}

    function setPercentToBurn(uint256 percent) external onlyOwner {
        require(percent <= 1e6, 'ARTHXController: tax percent > 1e6');

        taxPercentToBurn = percent; // In 6 precision.
    }

    function setPercentToRewards(uint256 percent) external onlyOwner {
        require(percent <= 1e6, 'ARTHXController: tax percent > 1e6');

        taxPercentToRewards = percent; // In 6 precision.
    }

    function setPercentToLiquidity(uint256 percent) external onlyOwner {
        require(percent <= 1e6, 'ARTHXController: tax percent > 1e6');

        taxPercentToLiquidity = percent; // In 6 precision.
    }

    function setRewardsDestination(address destination) external onlyOwner {
        require(rewardsDestination != owner(), 'TaxController: invalid addr');
        rewardsDestination = destination;
    }

    function chargeTax() external override {
        uint256 balance = arthx.balanceOf(address(this));

        uint256 burnAmount = balance.mul(taxPercentToBurn).div(1e6);
        if (burnAmount > 0) {
            arthx.burn(burnAmount);
            emit TaxCharged(address(this), address(0), burnAmount);
        }

        uint256 rewardsAmount = balance.mul(taxPercentToRewards).div(1e6);
        if (rewardsAmount > 0) {
            arthx.transfer(rewardsDestination, rewardsAmount);
            emit TaxCharged(address(this), rewardsDestination, rewardsAmount);
        }

        uint256 liquidityAmount = balance.sub(burnAmount).sub(rewardsAmount);
        if (liquidityAmount > 0) {
            _swapAndAddLiquidity(liquidityAmount);

            address destination =
                (
                    IUniswapV2Factory(router.factory()).getPair(
                        address(arthx),
                        router.WETH()
                    )
                );

            emit TaxCharged(address(this), destination, liquidityAmount);
        }
    }

    function _swapARTHXForETH(uint256 arthxAmount) internal {
        address[] memory path = new address[](2);
        path[0] = address(arthx);
        path[1] = router.WETH();

        require(
            arthx.approve(address(router), arthxAmount),
            'ARTHTaxController: approve failed'
        );

        router.swapExactTokensForETHSupportingFeeOnTransferTokens(
            arthxAmount,
            0, // Accept any amount of ETH.
            path,
            address(this),
            block.timestamp
        );
    }

    function _addLiquidity(uint256 arthxAmount, uint256 ethAmount) internal {
        require(
            arthx.approve(address(router), arthxAmount),
            'ARTHTaxController: approve failed'
        );

        router.addLiquidityETH{value: ethAmount}(
            address(arthx),
            arthxAmount,
            0, // slippage is unavoidable.
            0, // slippage is unavoidable.
            owner(),
            block.timestamp
        );
    }

    function _swapAndAddLiquidity(uint256 amount) internal {
        uint256 ethBalanceBeforeSwap = address(this).balance;

        uint256 swapHalf = amount.mul(50).div(100);
        _swapARTHXForETH(swapHalf);
        uint256 ethBalanceAfterSwap = address(this).balance;

        _addLiquidity(
            amount.sub(swapHalf),
            ethBalanceAfterSwap.sub(ethBalanceBeforeSwap)
        );
    }
}
