// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import './ArthPool.sol';

contract Pool_USDC is ArthPool {
    address public USDC_address;

    constructor(
        address _arth_contract_address,
        address _arthx_contract_address,
        address _collateral_address,
        address _creator_address,
        address _timelock_address,
        address _stability_fee_token,
        address _arth_stability_token_oracle,
        uint256 _pool_ceiling
    )
        ArthPool(
            _arth_contract_address,
            _arthx_contract_address,
            _collateral_address,
            _creator_address,
            _timelock_address,
            _stability_fee_token,
            _arth_stability_token_oracle,
            _pool_ceiling
        )
    {
        _setupRole(DEFAULT_ADMIN_ROLE, _msgSender());
        USDC_address = _collateral_address;
    }
}
