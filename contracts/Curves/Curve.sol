// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import {ICurve} from './ICurve.sol';
import {Ownable} from '../Common/Ownable.sol';

abstract contract Curve is ICurve, Ownable {
    /**
     * Events.
     */

    event MinSupplyChanged(
        address indexed operator,
        uint256 _old,
        uint256 _new
    );

    event MaxSupplyChanged(
        address indexed operator,
        uint256 _old,
        uint256 _new
    );

    event MinCeilingChanged(
        address indexed operator,
        uint256 _old,
        uint256 _new
    );

    event MaxCeilingChanged(
        address indexed operator,
        uint256 _old,
        uint256 _new
    );

    /**
     * State variables.
     */

    uint256 public override minSupply;
    uint256 public override maxSupply;
    uint256 public override minCeiling;
    uint256 public override maxCeiling;

    /**
     * Public.
     */

    function setMinSupply(uint256 _newMinSupply) public virtual onlyOwner {
        uint256 oldMinSupply = minSupply;
        minSupply = _newMinSupply;
        emit MinSupplyChanged(msg.sender, oldMinSupply, _newMinSupply);
    }

    function setMaxSupply(uint256 _newMaxSupply) public virtual onlyOwner {
        uint256 oldMaxSupply = maxSupply;
        maxSupply = _newMaxSupply;
        emit MaxSupplyChanged(msg.sender, oldMaxSupply, _newMaxSupply);
    }

    function setMinCeiling(uint256 _newMinCeiling) public virtual onlyOwner {
        uint256 oldMinCeiling = _newMinCeiling;
        minCeiling = _newMinCeiling;
        emit MinCeilingChanged(msg.sender, oldMinCeiling, _newMinCeiling);
    }

    function setMaxCeiling(uint256 _newMaxCeiling) public virtual onlyOwner {
        uint256 oldMaxCeiling = _newMaxCeiling;
        maxCeiling = _newMaxCeiling;
        emit MaxCeilingChanged(msg.sender, oldMaxCeiling, _newMaxCeiling);
    }

    function calcCeiling(uint256 _supply)
        external
        view
        virtual
        override
        returns (uint256);
}
