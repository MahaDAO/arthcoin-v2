// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import {Curve} from './Curve.sol';
import {Math} from '../utils/math/Math.sol';
import {SafeMath} from '../utils/math/SafeMath.sol';

contract IncreasingSigmoid is Curve {
    using SafeMath for uint256;

    /// @dev Slots to generate a sigmoid curve.
    uint256[] internal _slots;

    constructor(
        uint256 _minX,
        uint256 _maxX,
        uint256 _minY,
        uint256 _maxY,
        uint256[] memory slots
    ) {
        minX = _minX; // I.E 0%.
        maxX = _maxX; // I.E 100%.
        minY = _minY; // I.E 0.00669%.
        maxY = _maxY; // I.E 0.5%.

        _slots = slots;
    }

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

    function getY(uint256 x) public view virtual override returns (uint256) {
        if (x <= minX) return minY;
        if (x >= maxX) return maxY;

        uint256 slotWidth = maxX.sub(minX).div(_slots.length);
        uint256 xa = x.sub(minX).div(slotWidth);
        uint256 xb = Math.min(xa.add(1), _slots.length.sub(1));

        uint256 slope = _slots[xb].sub(_slots[xa]).mul(1e18).div(slotWidth);
        uint256 wy = _slots[xb].add(slope.mul(slotWidth.mul(xb)).div(1e18));

        uint256 percentage = 0;
        if (wy > slope.mul(x).div(1e18)) {
            percentage = wy.sub(slope.mul(x).div(1e18));
        } else {
            percentage = slope.mul(x).div(1e18).sub(wy);
        }

        return minY.add(maxY.sub(minY).mul(percentage).div(1e18));
    }
}
