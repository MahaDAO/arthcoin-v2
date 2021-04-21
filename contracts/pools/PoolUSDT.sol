// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import './core/ARTHPool.sol';
import {IARTH} from '../interfaces/IARTH.sol';
import {IERC20} from '../interfaces/IERC20.sol';
import {IARTHX} from '../interfaces/IARTHX.sol';

contract PoolUSDT is ARTHPool {
    constructor(
        IARTH _arthContractAddres,
        IARTHX _arthxContractAddres,
        IERC20 _collateralAddress,
        address _creatorAddress,
        address _timelockAddress,
        address _mahaToken,
        address _arthMAHAOracle,
        address _arthController,
        uint256 _poolCeiling,
        address __wethAddress
    )
        ARTHPool(
            _arthContractAddres,
            _arthxContractAddres,
            _collateralAddress,
            _creatorAddress,
            _timelockAddress,
            _mahaToken,
            _arthMAHAOracle,
            _arthController,
            _poolCeiling,
            __wethAddress
        )
    {
        _setupRole(DEFAULT_ADMIN_ROLE, _msgSender());
    }
}
