// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import './FraxPool.sol';

contract Pool_6DEC is FraxPool {
    address public _6DEC_address;

    constructor(
        address _frax_contract_address,
        address _fxs_contract_address,
        address _collateral_address,
        address _creator_address,
        address _timelock_address,
        address _stability_fee_token,
        address _arth_stability_token_oracle,
        uint256 _pool_ceiling
    )
        FraxPool(
            _frax_contract_address,
            _fxs_contract_address,
            _collateral_address,
            _creator_address,
            _timelock_address,
            _stability_fee_token,
            _arth_stability_token_oracle,
            _pool_ceiling
        )
    {
        _setupRole(DEFAULT_ADMIN_ROLE, _msgSender());
        _6DEC_address = _collateral_address;
    }
}
