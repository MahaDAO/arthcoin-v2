// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;
pragma experimental ABIEncoderV2;

import {IARTH} from '../Arth/IARTH.sol';
import {ERC20} from '../ERC20/ERC20.sol';
import {IARTHX} from '../ARTHX/IARTHX.sol';
import {Ownable} from '../Common/Ownable.sol';
import {SafeMath} from '../Math/SafeMath.sol';
import {IBondingCurve} from './IBondingCurve.sol';
import {IERC20Mintable} from '../ERC20/IERC20Mintable.sol';

contract Genesis is ERC20, Ownable {
    using SafeMath for uint256;

    /**
     * @dev Contract instances.
     */

    IARTH private _ARTH;
    IARTHX private _ARTHX;
    IERC20Mintable private _MAHA;
    IBondingCurve private _CURVE;

    /**
     * State variables.
     */

    uint256 public softCap = 100e18;
    uint256 public hardCap = 100e18;

    uint256 public arthETHPoolPercent = 90; // In %.
    uint256 public arthETHPairPercent = 5; // In %.
    uint256 public arthxETHPairPercent = 5; // In %.

    uint256 public duration;
    uint256 public startTime;

    address payable public arthETHPoolAddress;
    address payable public arthETHPairAddress;
    address payable public arthxETHPairAddress;
    /**
     * Events.
     */

    event Mint(address indexed account, uint256 ethAmount, uint256 genAmount);
    event RedeemARTH(address indexed account, uint256 amount);
    event RedeemARTHAndMAHA(
        address indexed account,
        uint256 arthAmount,
        uint256 mahaAmount
    );
    event Distribute(
        address indexed account,
        uint256 ethAMount,
        uint256 tokenAmount
    );

    /**
     * Modifiers.
     */

    modifier hasStarted() {
        require(block.timestamp >= startTime, 'Genesis: not started');
        _;
    }

    modifier isActive() {
        require(
            block.timestamp >= startTime &&
                block.timestamp <= startTime.add(duration),
            'Genesis: not active'
        );
        _;
    }

    modifier hasEnded() {
        require(
            block.timestamp >= startTime.add(duration),
            'Genesis: still active'
        );
        _;
    }

    /**
     * Constructor.
     */
    constructor(
        uint256 _startTime,
        uint256 _duration,
        IARTH __ARTH,
        IARTHX __ARTHX,
        IERC20Mintable __MAHA,
        IBondingCurve __CURVE
    ) ERC20('ARTH Gen', 'ARTH-GEN') {
        duration = _duration;
        startTime = _startTime;

        _ARTH = __ARTH;
        _MAHA = __MAHA;
        _ARTHX = __ARTHX;
        _CURVE = __CURVE;
    }

    receive() external payable {
        mint(msg.value);
    }

    /**
     * External.
     */

    function setDuration(uint256 _duration) external onlyOwner {
        duration = _duration;
    }

    function setPoolAndPairs(
        address payable _arthETHPool,
        address payable _arthETHPair,
        address payable _arthxETHPair
    ) external onlyOwner {
        arthETHPoolAddress = _arthETHPool;
        arthETHPairAddress = _arthETHPair;
        arthxETHPairAddress = _arthxETHPair;
    }

    function setCaps(uint256 _softCap, uint256 _hardCap) external onlyOwner {
        softCap = _softCap;
        hardCap = _hardCap;
    }

    function setARTHETHPoolAddress(address payable poolAddress)
        external
        onlyOwner
    {
        arthETHPoolAddress = poolAddress;
    }

    function setARTHETHPairAddress(address payable pairAddress)
        external
        onlyOwner
    {
        arthETHPairAddress = pairAddress;
    }

    function setDistributionPercents(
        uint256 poolPercent,
        uint256 arthPairPercent,
        uint256 arthxPairPercent
    ) external onlyOwner {
        arthETHPoolPercent = poolPercent;
        arthETHPairPercent = arthPairPercent;
        arthxETHPairPercent = arthxPairPercent;
    }

    function setARTHXETHPairAddress(address payable pairAddress)
        external
        onlyOwner
    {
        arthxETHPairAddress = pairAddress;
    }

    function setCurve(IBondingCurve curve) external onlyOwner {
        _CURVE = curve;
    }

    /**
     * Public.
     */

    function mint(uint256 amount) public payable isActive {
        require(amount > 0, 'Genesis: amount = 0');
        require(msg.value == amount, 'Genesis: INVALID INPUT');

        // Example:
        // Curve price is 0.37(37e16 in 1e18 precision).
        // Hence the amount to be minted becomes 1.37 i.e 137e16(1e18 + 37e16).
        uint256 mintRateWithDiscount = uint256(1e18).add(getCurvePrice());
        // Restore the precision to 1e18.
        uint256 mintAmount = amount.mul(mintRateWithDiscount).div(1e18);

        _mint(msg.sender, mintAmount);

        emit Mint(msg.sender, amount, mintAmount);
    }

    function redeem(uint256 amount) public {
        if (block.timestamp >= startTime.add(duration))
            _redeemARTHAndMAHA(amount);
        else _redeemARTH(amount);
    }

    function distribute() public onlyOwner hasEnded {
        uint256 balance = address(this).balance;

        // reuire(balance >= hardCap, 'Genesis: not enough raised');

        uint256 arthETHPoolAmount = balance.mul(arthETHPoolPercent).div(100);
        uint256 arthETHPairAmount = balance.mul(arthETHPairPercent).div(100);
        uint256 arthxETHPairAmount = balance.mul(arthxETHPairPercent).div(100);

        (bool poolSuccess, ) =
            arthETHPoolAddress.call{value: arthETHPoolAmount}('');
        require(poolSuccess, 'Genesis: distribut pool failed');

        (bool arthPairSuccess, ) =
            arthETHPairAddress.call{value: arthETHPairAmount}('');
        require(arthPairSuccess, 'Genesis: distribut ARTH pair failed');
        _ARTH.poolMint(arthETHPairAddress, arthETHPairAmount);

        (bool arthxPairSuccess, ) =
            arthxETHPairAddress.call{value: arthxETHPairAmount}('');
        require(arthxPairSuccess, 'Genesis: distribut ARTHX pair failed');
        _ARTHX.poolMint(arthxETHPairAddress, arthxETHPairAmount);

        emit Distribute(arthETHPoolAddress, arthETHPoolAmount, 0);
        emit Distribute(
            arthETHPairAddress,
            arthETHPoolAmount,
            arthETHPairAmount
        );
        emit Distribute(
            arthxETHPairAddress,
            arthETHPoolAmount,
            arthxETHPairAmount
        );
    }

    function getIsRaisedBelowSoftCap() public view returns (bool) {
        return address(this).balance <= softCap;
    }

    function getIsRaisedBetweenCaps() public view returns (bool) {
        return
            address(this).balance > softCap && address(this).balance <= hardCap;
    }

    function getPercentRaised() public view returns (uint256) {
        return address(this).balance.mul(100).div(hardCap);
    }

    function getCurvePrice() public view returns (uint256) {
        if (getIsRaisedBelowSoftCap())
            return _CURVE.getCurvePrice(getPercentRaised());

        return _CURVE.fixedPrice();
    }

    /**
     * Internal.
     */

    function _redeemARTH(uint256 amount) internal isActive {
        require(balanceOf(msg.sender) >= amount, 'Genesis: balance < amount');

        _burn(msg.sender, amount);
        _ARTH.poolMint(msg.sender, amount);

        emit RedeemARTH(msg.sender, amount);
    }

    function _redeemARTHAndMAHA(uint256 amount) internal hasEnded {
        require(balanceOf(msg.sender) >= amount, 'Genesis: balance < amount');

        _burn(msg.sender, amount);
        _ARTH.poolMint(msg.sender, amount);

        // TODO: distribute MAHA.
        uint256 mahaAmount = 0;

        _MAHA.mint(msg.sender, mahaAmount);

        emit RedeemARTHAndMAHA(msg.sender, amount, mahaAmount);
    }
}
