// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import {Math} from '@openzeppelin/contracts/utils/math/Math.sol';
import {SafeMath} from '@openzeppelin/contracts/utils/math/SafeMath.sol';

import {Curve} from './Curve.sol';

contract Sigmoid is Curve {
    using SafeMath for uint256;

    uint256[23] private slots;

    /**
     * Constructor.
     */

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

        slots[0] = 1000000000000000000;
        slots[1] = 994907149075715143;
        slots[2] = 988513057369406817;
        slots[3] = 982013790037908452;
        slots[4] = 970687769248643639;
        slots[5] = 952574126822433143;
        slots[6] = 924141819978756551;
        slots[7] = 880797077977882314;
        slots[8] = 817574476193643651;
        slots[9] = 731058578630004896;
        slots[10] = 622459331201854593;
        slots[11] = 500000000000000000;
        slots[12] = 377540668798145407;
        slots[13] = 268941421369995104;
        slots[14] = 182425523806356349;
        slots[15] = 119202922022117574;
        slots[16] = 75858180021243560;
        slots[17] = 47425873177566788;
        slots[18] = 29312230751356326;
        slots[19] = 17986209962091562;
        slots[20] = 11486942630593183;
        slots[21] = 5092850924284857;
        slots[22] = 0;
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

    function setMaxY(uint256 y) public override onlyOwner {
        super.setMaxY(y);
    }

    function getY(uint256 x) public view override returns (uint256) {
        // if (x <= minX) {
        //     return maxY;
        // }

        // Fail safe to return after maxX.
        if (x >= maxX) {
            return maxY;
        }

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
