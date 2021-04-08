// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import {ICurve} from './ICurve.sol';
import {Ownable} from '../Common/Ownable.sol';

abstract contract Curve is ICurve, Ownable {
    /**
     * Events.
     */

    event MinXChanged(address indexed operator, uint256 old, uint256 curr);

    event MaxXChanged(address indexed operator, uint256 old, uint256 curr);

    event MinYChanged(address indexed operator, uint256 old, uint256 curr);

    event MaxYChanged(address indexed operator, uint256 old, uint256 curr);

    /**
     * State variables.
     */

    uint256 public override minX;
    uint256 public override maxX;
    uint256 public override minY;
    uint256 public override maxY;
    uint256 public override fixedY; // Fixed Y(Price in some graphs) in case needed.

    /**
     * Public.
     */

    function setMinX(uint256 x) public virtual onlyOwner {
        uint256 oldMinX = minX;
        minX = x;
        emit MinXChanged(msg.sender, oldMinX, minX);
    }

    function setMaxX(uint256 x) public virtual onlyOwner {
        uint256 oldMaxSupply = maxX;
        maxX = x;
        emit MaxXChanged(msg.sender, oldMaxSupply, maxX);
    }

    function setMinY(uint256 y) public virtual onlyOwner {
        uint256 oldMinY = minY;
        minY = y;
        emit MinYChanged(msg.sender, oldMinY, minY);
    }

    function setMaxY(uint256 y) public virtual onlyOwner {
        uint256 oldMaxY = maxY;
        maxY = y;
        emit MaxYChanged(msg.sender, oldMaxY, maxY);
    }

    function getY(uint256 x) external view virtual override returns (uint256);
}
