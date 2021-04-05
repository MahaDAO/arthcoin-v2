// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;
pragma experimental ABIEncoderV2;

//import './Arth.sol';
import '../Interfaces/IArth.sol';
import '../Governance/AccessControl.sol';

contract ArthBridge is AccessControl {
    /* ========== STATE VARIABLES ========== */

    IArth private ARTH;
    address public timelock_address;
    address public owner_address;

    uint256 public cumulative_deposits;
    uint256 public cumulative_withdrawals;

    /* ========== MODIFIERS ========== */

    modifier onlyByOwnerOrGovernance() {
        require(
            msg.sender == timelock_address || msg.sender == owner_address,
            'You are not the owner or the governance timelock'
        );
        _;
    }

    /* ========== CONSTRUCTOR ========== */

    constructor(
        address _arth_contract_address,
        address _creator_address,
        address _timelock_address
    ) {
        ARTH = IArth(_arth_contract_address);
        timelock_address = _timelock_address;
        owner_address = _creator_address;
        _setupRole(DEFAULT_ADMIN_ROLE, owner_address);
    }

    /* ========== VIEWS ========== */

    // Needed for compatibility to use poolMint()
    function collatDollarBalance() public pure returns (uint256) {
        return 0;
    }

    /* ========== PUBLIC FUNCTIONS ========== */

    function depositArth(
        uint256 _chain_id,
        string memory _to,
        uint256 _amount_d18
    ) external {
        ARTH.transferFrom(msg.sender, address(this), _amount_d18);
        cumulative_deposits += _amount_d18;
        ARTH.poolBurnFrom(address(this), _amount_d18);
        emit receivedDeposit(_chain_id, _to, _amount_d18);
    }

    /* ========== RESTRICTED FUNCTIONS ========== */

    function withdrawArth(address _to, uint256 _amount_d18)
        external
        onlyByOwnerOrGovernance
    {
        cumulative_withdrawals += _amount_d18;
        ARTH.poolMint(_to, _amount_d18);
    }

    /* ========== EVENTS ========== */

    // Deposit _amount_d18 to address _to on chain specified by _chain_id
    event receivedDeposit(uint256 _chain_id, string _to, uint256 _amount_d18);
}
