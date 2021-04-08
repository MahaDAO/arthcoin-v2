// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;
pragma experimental ABIEncoderV2;

import '@openzeppelin/contracts/token/ERC20/ERC20.sol';
import '../Oracle/IChainlinkOracle.sol';
import '../Math/SafeMath.sol';
import './BondingCurve.sol';
import {IARTH} from '../Arth/IARTH.sol';
import {Ownable} from '../Common/Ownable.sol';

//import '../Arth/Pools/Pool_'

contract Genesis is ERC20, Ownable {
    using SafeMath for uint256;

    uint256 public hardcap;
    uint256 public softcap = 0;
    // uint256 public EthPrice = 2000;
    uint256 public ethRaised;
    uint8 private eth_usd_pricer_decimals;
    uint256 private constant PRICE_PRECISION = 1e6;

    IChainlinkOracle private ethGMUPricer;
    BondingCurve private bondingCurve;
    IARTH private arth;

    address payable private arthPoolAddress;
    address payable private uniswapARTHETHPoolAddress;
    address payable private uniswapARTHXETHPoolAddress;

    bool private saleClosed = false;

    constructor(
        BondingCurve _bondingCurve,
        IARTH _arth,
        IChainlinkOracle _ethGMUPricer,
        address payable _arthPoolAddress,
        uint256 _hardcap,
        uint256 _softcap
    ) ERC20('Arth Genesis Token', 'ARTHG') {
        bondingCurve = _bondingCurve;
        arth = _arth;
        ethGMUPricer = _ethGMUPricer;
        arthPoolAddress = _arthPoolAddress;
        hardcap = _hardcap;
        softcap = _softcap;
    }

    function setUniswapARTHETHPoolAddress(address payable _poolAddress)
        public
        onlyOwner
    {
        uniswapARTHETHPoolAddress = _poolAddress;
    }

    function setUniswapARTHxETHPoolAddress(address payable _poolAddress)
        public
        onlyOwner
    {
        uniswapARTHXETHPoolAddress = _poolAddress;
    }

    function setSaleState(bool _state) public onlyOwner returns (bool) {
        saleClosed = _state;
        return saleClosed;
    }

    function getSaleState(bool _state) public returns (bool) {
        return saleClosed;
    }

    function mintGenesisToken(uint256 _collateralAmount) public payable {
        uint256 ethUsdPrice =
            uint256(ethGMUPricer.getLatestPrice()).mul(PRICE_PRECISION).div(
                uint256(10)**eth_usd_pricer_decimals
            );

        require(msg.value == _collateralAmount, 'Genesis: value mismatch');
        require(_collateralAmount != 0, 'Genesis: no value sent');

        uint256 EthEvaluation = _collateralAmount.mul(ethUsdPrice);
        uint256 _ethRaised = ethRaised.add(_collateralAmount);
        uint256 genesisPrice =
            bondingCurve._getGenesisPrice(_ethRaised, hardcap);
        uint256 genesisTokenAmount = EthEvaluation.div(genesisPrice);

        // address(this).transfer(msg.value);
        _mint(msg.sender, genesisTokenAmount);
    }

    function reedemOnlyArth(uint256 _genesisTokenAmount) public payable {
        require(
            balanceOf(msg.sender) >= _genesisTokenAmount,
            'Genesis: Insufficent genesis funds'
        );

        require(!saleClosed, 'Genesis: Sale Closed');

        _burn(msg.sender, _genesisTokenAmount);

        arth.poolMint(msg.sender, _genesisTokenAmount);
    }

    function reedemWithMaha(uint256 _genesisTokenAmount) public payable {
        require(
            balanceOf(msg.sender) >= _genesisTokenAmount,
            'Genesis: Insufficent genesis funds'
        );

        require(saleClosed, 'Genesis: Sale Open');

        _burn(msg.sender, _genesisTokenAmount);

        arth.poolMint(msg.sender, _genesisTokenAmount);

        // distribute Maha
    }

    function distributeEthToPool() public payable onlyOwner {
        uint256 ethAmount = hardcap.mul(90).div(100);

        require(
            address(this).balance >= ethAmount,
            'Genesis: Not Enough Funds raised yet'
        );
        (bool success, ) = arthPoolAddress.call{value: ethAmount}('');

        require(success, 'Genesis: Issue with ETH distribution to pool');
    }

    function distrubuteToUniswapArthETH() public payable onlyOwner {
        uint256 ethAmount = hardcap.mul(5).div(100);

        require(
            address(this).balance >= ethAmount,
            'Genesis: Not Enough Funds raised yet'
        );
        (bool success, ) = arthPoolAddress.call{value: ethAmount}('');

        require(
            success,
            'Genesis: Issue with ETH distribution to uniswap ARTH/ETH pool'
        );
    }

    function distrubuteToUniswapArthxETH() public payable onlyOwner {
        uint256 ethAmount = hardcap.mul(5).div(100);

        require(
            address(this).balance >= ethAmount,
            'Genesis: Not Enough Funds raised yet'
        );
        (bool success, ) = arthPoolAddress.call{value: ethAmount}('');

        require(
            success,
            'Genesis: Issue with ETH distribution to uniswap ARTHX/ETH pool'
        );
    }
}
