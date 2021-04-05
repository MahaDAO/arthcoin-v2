// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

interface IArthPartial {
    function totalSupply() external view returns (uint256);

    function balanceOf(address account) external view returns (uint256);

    function transfer(address recipient, uint256 amount)
        external
        returns (bool);

    function allowance(address owner, address spender)
        external
        view
        returns (uint256);

    function approve(address spender, uint256 amount) external returns (bool);

    function transferFrom(
        address sender,
        address recipient,
        uint256 amount
    ) external returns (bool);

    function owner_address() external returns (address);

    function creator_address() external returns (address);

    function timelock_address() external returns (address);

    function controller_address() external returns (address);

    function arthx_address() external returns (address);

    function arth_eth_oracle_address() external returns (address);

    function arthx_eth_oracle_address() external returns (address);

    function weth_address() external returns (address);

    function eth_usd_consumer_address() external returns (address);

    function genesis_supply() external returns (uint256);

    function arth_pools_array() external returns (address[] memory);

    function arth_pools(address a) external returns (bool);

    function global_collateral_ratio() external returns (uint256);

    function redemption_fee() external returns (uint256);

    function minting_fee() external returns (uint256);

    function arth_step() external returns (uint256);

    function refresh_cooldown() external returns (uint256);

    function price_target() external returns (uint256);

    function price_band() external returns (uint256);

    function DEFAULT_ADMIN_ADDRESS() external returns (address);

    function COLLATERAL_RATIO_PAUSER() external returns (bytes32);

    function collateral_ratio_paused() external returns (bool);

    function last_call_time() external returns (uint256);

    /* ========== VIEWS ========== */
    function arth_price() external returns (uint256);

    function arthx_price() external returns (uint256);

    function eth_usd_price() external returns (uint256);

    function arth_info()
        external
        returns (
            uint256,
            uint256,
            uint256,
            uint256,
            uint256,
            uint256,
            uint256,
            uint256
        );

    function globalCollateralValue() external returns (uint256);

    /* ========== PUBLIC FUNCTIONS ========== */
    function refreshCollateralRatio() external;
}
