// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

// ====================================================================
// |     ______                   _______                             |
// |    / _____________ __  __   / ____(_____  ____ _____  ________   |
// |   / /_  / ___/ __ `| |/_/  / /_  / / __ \/ __ `/ __ \/ ___/ _ \  |
// |  / __/ / /  / /_/ _>  <   / __/ / / / / / /_/ / / / / /__/  __/  |
// | /_/   /_/   \__,_/_/|_|  /_/   /_/_/ /_/\__,_/_/ /_/\___/\___/   |
// |                                                                  |
// ====================================================================
// =========================== ReserveTracker =========================
// ====================================================================
// Arth Finance: https://github.com/ArthFinance

// Primary Author(s)
// Jason Huan: https://github.com/jasonhuan
// Sam Kazemian: https://github.com/samkazemian

// Reviewer(s) / Contributor(s)
// Travis Moore: https://github.com/FortisFortuna

import '../Math/SafeMath.sol';
import '../Math/Math.sol';
import '../Uniswap/Interfaces/IUniswapV2Pair.sol';
import './UniswapPairOracle.sol';
import './ChainlinkETHUSDPriceConsumer.sol';
//import "../Curve/MetaImplementationUSD.vy";
import '../Curve/IMetaImplementationUSD.sol';

contract ReserveTracker {
    using SafeMath for uint256;

    uint256 public CONSULT_ARTHS_DEC;
    uint256 public CONSULT_ARTH_DEC;

    address public arth_contract_address;
    address public arths_contract_address;
    address public owner_address;
    address public timelock_address;

    // The pair of which to get ARTHS price from
    address public arths_weth_oracle_address;
    address public weth_collat_oracle_address;
    address public weth_address;
    UniswapPairOracle public arths_weth_oracle;
    UniswapPairOracle public weth_collat_oracle;
    uint256 public weth_collat_decimals;

    // Array of pairs for ARTHS
    address[] public arths_pairs_array;

    // Mapping is also used for faster verification
    mapping(address => bool) public arths_pairs;

    uint256 public arths_reserves;

    // The pair of which to get ARTH price from
    address public arth_price_oracle_address;
    address public arth_pair_collateral_address;
    uint256 public arth_pair_collateral_decimals;
    UniswapPairOracle public arth_price_oracle;
    address public arth_metapool_address;
    IMetaImplementationUSD public arth_metapool;

    /* ========== MODIFIERS ========== */

    modifier onlyByOwnerOrGovernance() {
        require(
            msg.sender == owner_address || msg.sender == timelock_address,
            'You are not the owner or the governance timelock'
        );
        _;
    }

    /* ========== CONSTRUCTOR ========== */

    constructor(
        address _arth_contract_address,
        address _arths_contract_address,
        address _creator_address,
        address _timelock_address
    ) {
        arth_contract_address = _arth_contract_address;
        arths_contract_address = _arths_contract_address;
        owner_address = _creator_address;
        timelock_address = _timelock_address;
    }

    /* ========== VIEWS ========== */

    // Returns ARTH price with 6 decimals of precision
    function getARTHPrice() public view returns (uint256) {
        return
            arth_price_oracle.consult(arth_contract_address, CONSULT_ARTH_DEC);
    }

    uint256 public last_timestamp;
    uint256[2] public old_twap;

    function getARTHCurvePrice() public returns (uint256) {
        uint256[2] memory new_twap = arth_metapool.get_price_cumulative_last();
        uint256[2] memory balances =
            arth_metapool.get_twap_balances(
                old_twap,
                new_twap,
                block.timestamp - last_timestamp
            );
        last_timestamp = block.timestamp;
        old_twap = new_twap;
        uint256 twap_price =
            arth_metapool.get_dy(1, 0, 1e18, balances).mul(1e6).div(
                arth_metapool.get_virtual_price()
            );
        return twap_price;
    }

    // Returns ARTHS price with 6 decimals of precision
    function getARTHSPrice() public view returns (uint256) {
        uint256 arths_weth_price =
            arths_weth_oracle.consult(arths_contract_address, 1e6);
        return
            weth_collat_oracle
                .consult(weth_address, CONSULT_ARTHS_DEC)
                .mul(arths_weth_price)
                .div(1e6);
    }

    function getARTHSReserves() public view returns (uint256) {
        uint256 total_arths_reserves = 0;

        for (uint256 i = 0; i < arths_pairs_array.length; i++) {
            // Exclude null addresses
            if (arths_pairs_array[i] != address(0)) {
                if (
                    IUniswapV2Pair(arths_pairs_array[i]).token0() ==
                    arths_contract_address
                ) {
                    (uint256 reserves0, , ) =
                        IUniswapV2Pair(arths_pairs_array[i]).getReserves();
                    total_arths_reserves = total_arths_reserves.add(reserves0);
                } else if (
                    IUniswapV2Pair(arths_pairs_array[i]).token1() ==
                    arths_contract_address
                ) {
                    (, uint256 reserves1, ) =
                        IUniswapV2Pair(arths_pairs_array[i]).getReserves();
                    total_arths_reserves = total_arths_reserves.add(reserves1);
                }
            }
        }

        return total_arths_reserves;
    }

    /* ========== RESTRICTED FUNCTIONS ========== */

    // Get the pair of which to price ARTH from
    function setARTHPriceOracle(
        address _arth_price_oracle_address,
        address _arth_pair_collateral_address,
        uint256 _arth_pair_collateral_decimals
    ) public onlyByOwnerOrGovernance {
        arth_price_oracle_address = _arth_price_oracle_address;
        arth_pair_collateral_address = _arth_pair_collateral_address;
        arth_pair_collateral_decimals = _arth_pair_collateral_decimals;
        arth_price_oracle = UniswapPairOracle(arth_price_oracle_address);
        CONSULT_ARTH_DEC =
            1e6 *
            (10**(uint256(18).sub(arth_pair_collateral_decimals)));
    }

    function setMetapool(address _arth_metapool_address)
        public
        onlyByOwnerOrGovernance
    {
        arth_metapool_address = _arth_metapool_address;
        arth_metapool = IMetaImplementationUSD(_arth_metapool_address);
    }

    // Get the pair of which to price ARTHS from (using ARTHS-WETH)
    function setARTHSETHOracle(
        address _arths_weth_oracle_address,
        address _weth_address
    ) public onlyByOwnerOrGovernance {
        arths_weth_oracle_address = _arths_weth_oracle_address;
        weth_address = _weth_address;
        arths_weth_oracle = UniswapPairOracle(arths_weth_oracle_address);
    }

    function setETHCollateralOracle(
        address _weth_collateral_oracle_address,
        uint256 _collateral_decimals
    ) public onlyByOwnerOrGovernance {
        weth_collat_oracle_address = _weth_collateral_oracle_address;
        weth_collat_decimals = _collateral_decimals;
        weth_collat_oracle = UniswapPairOracle(_weth_collateral_oracle_address);
        CONSULT_ARTHS_DEC = 1e6 * (10**(uint256(18).sub(_collateral_decimals)));
    }

    // Adds collateral addresses supported, such as tether and busd, must be ERC20
    function addARTHSPair(address pair_address) public onlyByOwnerOrGovernance {
        require(arths_pairs[pair_address] == false, 'address already exists');
        arths_pairs[pair_address] = true;
        arths_pairs_array.push(pair_address);
    }

    // Remove a pool
    function removeARTHSPair(address pair_address)
        public
        onlyByOwnerOrGovernance
    {
        require(
            arths_pairs[pair_address] == true,
            "address doesn't exist already"
        );

        // Delete from the mapping
        delete arths_pairs[pair_address];

        // 'Delete' from the array by setting the address to 0x0
        for (uint256 i = 0; i < arths_pairs_array.length; i++) {
            if (arths_pairs_array[i] == pair_address) {
                arths_pairs_array[i] = address(0); // This will leave a null in the array and keep the indices the same
                break;
            }
        }
    }

    function setOwner(address _owner_address) external onlyByOwnerOrGovernance {
        owner_address = _owner_address;
    }

    function setTimelock(address new_timelock)
        external
        onlyByOwnerOrGovernance
    {
        timelock_address = new_timelock;
    }
}
