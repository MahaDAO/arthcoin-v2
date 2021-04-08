// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;
pragma experimental ABIEncoderV2;

import '@openzeppelin/contracts/token/ERC20/ERC20.sol';
import '../Oracle/IChainlinkOracle.sol';
import '../Math/SafeMath.sol';
import './BondingCurve.sol';
import {IARTH} from '../Arth/IARTH.sol';

contract Genesis is ERC20 {
    using SafeMath for uint256;

    uint256 public hardcap;
    uint256 public softcap = 0;
    // uint256 public EthPrice = 2000;
    uint256 public ethRaised;

    IChainlinkOracle private ethGMUPricer;
    BondingCurve private bondingCurve;
    IARTH private arth;

    uint8 private eth_usd_pricer_decimals;
    uint256 private constant PRICE_PRECISION = 1e6;

    bool private saleClosed = false;

    constructor(
        BondingCurve _bondingCurve,
        IARTH _arth,
        IChainlinkOracle _ethGMUPricer,
        uint256 _hardcap,
        uint256 _softcap
    ) public ERC20('Arth Genesis Token', 'ARTHG') {
        bondingCurve = _bondingCurve;
        arth = _arth;
        ethGMUPricer = _ethGMUPricer;
        hardcap = _hardcap;
        softcap = _softcap;
    }

    function setSaleState(bool _state) public returns (bool) {
        saleClosed = _state;
        return saleClosed;
    }

    function getSaleState(bool _state) public returns (bool) {
        return saleClosed;
    }

    function mintGenesisToken(uint256 _collateralAmount) public payable {
        uint256 eth_2_usd_price =
            uint256(ethGMUPricer.getLatestPrice()).mul(PRICE_PRECISION).div(
                uint256(10)**eth_usd_pricer_decimals
            );

        require(msg.value == _collateralAmount, 'Genesis: value mismatch');
        require(_collateralAmount != 0, 'Genesis: no value sent');

        uint256 EthEvaluation = _collateralAmount.mul(eth_2_usd_price);
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
    }

    receive() external payable {}
}
