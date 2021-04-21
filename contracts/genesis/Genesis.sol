// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;
pragma experimental ABIEncoderV2;

import {Ownable} from "../access/Ownable.sol";
import {IARTH} from "../interfaces/IARTH.sol";
import {IWETH} from "../interfaces/IWETH.sol";
import {ERC20} from "../assets/core/ERC20.sol";
import {IARTHX} from "../interfaces/IARTHX.sol";
import {SafeMath} from "../utils/math/SafeMath.sol";
import {IERC20Mintable} from "../interfaces/IERC20Mintable.sol";
import {IChainlinkOracle} from "../interfaces/IChainlinkOracle.sol";
import {IBondingCurveOracle} from "../interfaces/IBondingCurveOracle.sol";
import {IUniswapV2Factory} from "../interfaces/uniswap/IUniswapV2Factory.sol";
import {IUniswapV2Router02} from "../interfaces/uniswap/IUniswapV2Router02.sol";

contract Genesis is ERC20, Ownable {
    using SafeMath for uint256;

    IWETH public weth;
    IARTH public arth;
    IARTHX public arthx;
    IERC20Mintable public maha;
    IUniswapV2Router02 public router;
    IChainlinkOracle public ethGMUOracle;
    IBondingCurveOracle public curveOracle;

    uint256 public hardCap;
    uint256 public duration;
    uint256 public startTime;

    uint256 public arthETHPairPercent = 5; // In %.
    uint256 public arthxETHPairPercent = 5; // In %.
    uint256 public arthWETHPoolPercent = 90; // In %.

    address payable public arthETHPair;
    address payable public arthxETHPair;
    address payable public arthWETHPool;

    uint256 private constant _PRICE_PRECISION = 1e6;

    event Mint(address indexed account, uint256 ethAmount, uint256 genAmount);
    event RedeemARTH(address indexed account, uint256 amount);
    event RedeemARTHXAndMAHA(
        address indexed account,
        uint256 arthAmount,
        uint256 mahaAmount
    );
    event Distribute(
        address indexed account,
        uint256 ethAMount,
        uint256 tokenAmount
    );

    modifier hasStarted() {
        require(block.timestamp >= startTime, "Genesis: not started");
        _;
    }

    modifier isActive() {
        require(
            block.timestamp >= startTime &&
                block.timestamp <= startTime.add(duration),
            "Genesis: not active"
        );
        _;
    }

    modifier hasEnded() {
        require(
            block.timestamp >= startTime.add(duration),
            "Genesis: still active"
        );
        _;
    }

    constructor(
        IWETH weth_,
        IARTH arth_,
        IARTHX arthx_,
        IERC20Mintable maha_,
        IUniswapV2Router02 router_,
        IChainlinkOracle ethGmuOracle_,
        IBondingCurveOracle curveOracle_,
        uint256 hardCap_,
        uint256 startTime_,
        uint256 duration_
    ) ERC20("ARTH Genesis", "ARTH-GEN") {
        hardCap = hardCap_;
        duration = duration_;
        startTime = startTime_;

        weth = weth_;
        arth = arth_;
        maha = maha_;
        arthx = arthx_;

        router = router_;
        curveOracle = curveOracle_;
        ethGMUOracle = ethGmuOracle_;
    }

    receive() external payable {
        mint(msg.value);
    }

    function setDuration(uint256 _duration) external onlyOwner {
        duration = _duration;
    }

    function setPoolAndPairs(
        address payable _arthETHPool,
        address payable _arthETHPair,
        address payable _arthxETHPair
    ) external onlyOwner {
        arthWETHPool = _arthETHPool;
        arthETHPair = _arthETHPair;
        arthxETHPair = _arthxETHPair;
    }

    function setARTHWETHPool(address payable poolAddress) external onlyOwner {
        arthWETHPool = poolAddress;
    }

    function setARTHETHPair(address payable pairAddress) external onlyOwner {
        arthETHPair = pairAddress;
    }

    function setARTHXETHPair(address payable pairAddress) external onlyOwner {
        arthxETHPair = pairAddress;
    }

    function setDistributionPercents(
        uint256 poolPercent,
        uint256 arthPairPercent,
        uint256 arthxPairPercent
    ) external onlyOwner {
        arthWETHPoolPercent = poolPercent;
        arthETHPairPercent = arthPairPercent;
        arthxETHPairPercent = arthxPairPercent;
    }

    function setCurveOracle(IBondingCurveOracle oracle) external onlyOwner {
        curveOracle = oracle;
    }

    function setETHGMUOracle(IChainlinkOracle oracle) external onlyOwner {
        ethGMUOracle = oracle;
    }

    function setHardCap(uint256 cap) external onlyOwner {
        hardCap = cap;
    }

    function mint(uint256 amount) public payable isActive {
        require(amount > 0, "Genesis: amount = 0");
        require(msg.value == amount, "Genesis: INVALID INPUT");

        // 1. Get the value of ETH put as collateral.
        uint256 ethValue = msg.value.mul(getETHGMUPrice());
        // 2. Calculate the equivalent amount of tokens to mint based on curve/oracle.
        uint256 mintAmount = ethValue.mul(1e18).div(getCurvePrice());

        _mint(msg.sender, mintAmount);

        emit Mint(msg.sender, amount, mintAmount);
    }

    function redeem(uint256 amount) public {
        if (block.timestamp >= startTime.add(duration)) {
            _redeemARTHXAndMAHA(amount);
            return;
        }

        _redeemARTHX(amount);
    }

    function distribute() public onlyOwner hasEnded {
        uint256 balance = address(this).balance;

        uint256 arthETHPairAmount = balance.mul(arthETHPairPercent).div(100);
        uint256 arthWETHPoolAmount = balance.mul(arthWETHPoolPercent).div(100);
        uint256 arthxETHPairAmount = balance.mul(arthxETHPairPercent).div(100);

        _distributeToWETHPool(arthWETHPoolAmount);
        _distributeToUniswapPair(arthETHPair, arthETHPairAmount);
        _distributeToUniswapPair(arthxETHPair, arthxETHPairAmount);
    }

    function getETHGMUPrice() public view returns (uint256) {
        return
            ethGMUOracle.getLatestPrice().mul(_PRICE_PRECISION).div(
                ethGMUOracle.getDecimals()
            );
    }

    function getPercentRaised() public view returns (uint256) {
        return address(this).balance.mul(100).div(hardCap);
    }

    function getCurvePrice() public view returns (uint256) {
        return
            curveOracle.getPrice(getPercentRaised()).mul(_PRICE_PRECISION).div(
                1e18
            );
    }

    function _distributeToWETHPool(uint256 amount) internal hasEnded {
        if (arthWETHPool == address(0)) return;
        // require(arthWETHPool != address(0), 'Genesis: invalid address');

        // 1. Convert ETH to WETH.
        weth.deposit{value: amount}();

        // 2. Transfer WETH to ARTH-WETH Collateral Pool.
        assert(weth.transfer(arthWETHPool, amount));

        emit Distribute(arthWETHPool, amount, 0);
    }

    function _distributeToUniswapPair(address pair, uint256 amount)
        internal
        hasEnded
    {
        address tokenAddress = address(0);

        // If the pair address is not set, then return;
        if (pair == address(0)) return;
        // require(pair != address(0), 'Genesis: invalid pair');

        // Check if pair is arth pair or arthx pair.
        if (pair == arthETHPair) {
            // If arth pair mint and approve ARTH for router to add liquidity.
            arth.poolMint(address(this), amount);
            arth.approve(address(router), amount);

            tokenAddress = address(arth);
        } else {
            // If arthx pair mint and approve ARTHX for router to add liquidity.
            arthx.poolMint(address(this), amount);
            arthx.approve(address(router), amount);

            tokenAddress = address(arthx);
        }
        // Fail safe check.
        require(tokenAddress != address(0), "Genesis: invalid address");

        // Add liquidity to pair.
        (uint256 amountToken, uint256 amountETH, uint256 liquidity) =
            router.addLiquidityETH{value: amount}(
                tokenAddress,
                amount,
                amount,
                amount,
                address(this),
                block.timestamp
            );

        require(liquidity > 0, "Genesis: distribute pair failed");
        require(amountETH > 0, "Genesis: distribute pair failed");
        require(amountToken > 0, "Genesis: distribute pair failed");

        emit Distribute(pair, amount, amount);
    }

    function _redeemARTHX(uint256 amount) internal isActive {
        require(balanceOf(msg.sender) >= amount, "Genesis: balance < amount");

        _burn(msg.sender, amount);
        arthx.poolMint(msg.sender, amount);

        emit RedeemARTH(msg.sender, amount);
    }

    function _redeemARTHXAndMAHA(uint256 amount) internal hasEnded {
        require(balanceOf(msg.sender) >= amount, "Genesis: balance < amount");

        _burn(msg.sender, amount);
        arthx.poolMint(msg.sender, amount);

        // TODO: distribute MAHA.
        // HOW?
        uint256 mahaAmount = 0;

        // NOTE: need to be given and revoked MINTER ROLE accordingly.
        maha.mint(msg.sender, mahaAmount);

        emit RedeemARTHXAndMAHA(msg.sender, amount, mahaAmount);
    }
}
