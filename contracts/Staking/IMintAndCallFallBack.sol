// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

interface IMintAndCallFallBack {
    function receiveMint(
        address from,
        uint256 amount,
        uint256 lockedDuration,
        bytes memory data
    ) external;
}
