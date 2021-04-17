// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import {Math} from '../utils/math/Math.sol';
import {SafeMath} from '../utils/math/SafeMath.sol';

import {Curve} from './Curve.sol';

contract Sigmoid is Curve {
    using SafeMath for uint256;

    uint256[24] private slots;

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
        minX = _minX;  // I.E 0%.
        maxX = _maxX;  // I.E 100%.
        minY = _minY;  // I.E 0.00669%.
        maxY = _maxY;  // I.E 0.5%.

        slots[0] = 270099601612513200;  // 4%.
        slots[1] = 240787403932528800;  // 8%.
        slots[2] = 212606216264522750;  // 12%.
        slots[3] = 186015311323432480;
        slots[4] = 161364852821997060;
        slots[5] = 138885129900589460;
        slots[6] = 118689666864850910;
        slots[7] = 100788968919645330;
        slots[8] = 85110638940292770;
        slots[9] = 71521753213270600;
        slots[10] = 59850293471811120;
        slots[11] = 49903617896353400;
        slots[12] = 41483052206008160;
        slots[13] = 34394505539321240;
        slots[14] = 28455523906540110;
        slots[15] = 23499433678058600;
        slots[16] = 19377278819070276;
        slots[17] = 15958196146119572;
        slots[18] = 13128762561678342;
        slots[19] = 10791725977254928;
        slots[20] = 8864419015963841;
        slots[21] = 7277060990564577;
        slots[22] = 5971081120142552;
        slots[23] = 4897542691895928;
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
        if (x <= minX) return maxY;  // Fail safe to return after maxX.
        if (x >= maxX) return minY;  // Fail safe to return after maxX.

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
