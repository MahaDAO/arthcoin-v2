// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import {Boardroom} from './core/Boardroom.sol';

/// @title Boardroom contract
/// @author Jerry Smith
contract ARTHXBoardroom is Boardroom {
    /* ========== CONSTRUCTOR ========== */

    /// @notice Contract constructor
    /// @param _tokenStore TokenStore address
    /// @param _cash BAC address
    constructor(address _tokenStore, address _cash)
        Boardroom(_tokenStore, _cash)
    {}
}
