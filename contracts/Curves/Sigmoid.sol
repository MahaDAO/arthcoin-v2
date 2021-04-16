// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import {Math} from '../utils/math/Math.sol';
import {SafeMath} from '../utils/math/SafeMath.sol';

import {Curve} from './Curve.sol';

contract Sigmoid is Curve {
    using SafeMath for uint256;

    uint256[23] private slots; // Note: 26 slots including slot 0

    /**
     * Constructor.
     */

    // NOTE: x is % deviation, y is discount in 1e18 precision.
    constructor(
        uint256 _minX,
        uint256 _maxX,
        uint256 _minY,
        uint256 _maxY
    ) {
        minX = _minX;
        maxX = _maxX;
        minY = _minY;
        maxY = _maxY;

        slots[22] = 40e16; // 0.401- Larget deviation- heavy discount.
        slots[21] = 354e15; // 0.354
        slots[20] = 31e16; // 0.310
        slots[19] = 2689e14; // 0.2689
        slots[18] = 2314e14; // 0.2314
        slots[17] = 197e15; // 0.197
        slots[16] = 167e15; // 0.167
        slots[15] = 141e15; // 0.141
        slots[14] = 1192e14; // 0.1192
        slots[13] = 997e14; // 0.0997
        slots[12] = 831e14; // 0.0831
        slots[11] = 691e14; // 0.0691
        slots[10] = 573e14; // 0.0573
        slots[9] = 474e14; // 0.047
        slots[8] = 391e14; // 0.0391
        slots[7] = 322e14; // 0.0322
        slots[6] = 265e14; // 0.0265
        slots[5] = 218e14; // 0.0218
        slots[4] = 179e14; // 0.0179
        slots[3] = 147e14; // 0.0147
        slots[2] = 121e14; // 0.0121
        slots[1] = 995e13; // 0.00995
        slots[0] = 816e13; // 0.00816- Smaller deviation- smaller discount.
    }

    /**
     * Public.
     */

    function setMinX(uint256 x) public override onlyOwner {
        super.setMinX(x);
    }

    function setMaxX(uint256 x) public override onlyOwner {
        super.setMaxX(x);
    }

    function setMinY(uint256 y) public override onlyOwner {
        super.setMinY(y);
    }

    function setFixedY(uint256 y) public override onlyOwner {
        super.setFixedY(y);
    }

    function setMaxY(uint256 y) public override onlyOwner {
        super.setMaxY(y);
    }

    function getY(uint256 x) public view override returns (uint256) {
        if (x <= minX) return minX; // return maxY;

        // Fail safe to return after maxX.
        if (x >= maxX) return maxY;

        uint256 slotWidth = maxX.sub(minX).div(slots.length);
        uint256 xa = x.sub(minX).div(slotWidth);
        uint256 xb = Math.min(xa.add(1), slots.length.sub(1));

        uint256 slope = slots[xa].sub(slots[xb]).mul(1e18).div(slotWidth);
        uint256 wy = slots[xa].add(slope.mul(slotWidth.mul(xa)).div(1e18));

        uint256 percentage = 0;
        if (wy > slope.mul(x).div(1e18)) {
            percentage = wy.sub(slope.mul(x).div(1e18));
        } else {
            percentage = slope.mul(x).div(1e18).sub(wy);
        }

        return minY.add(maxY.sub(minY).mul(percentage).div(1e18));
    }
}
