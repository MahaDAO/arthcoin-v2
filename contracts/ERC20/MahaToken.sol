// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

// import '@openzeppelin/contracts/contracts/presets/ERC20PresetMinterPauser.sol';
import '@openzeppelin/contracts/token/ERC20/ERC20.sol';

/**
 * @title  MahaToken.
 * @author Steven Enamake.
 */
contract MahaToken is ERC20 {
    address public upgradedAddress;
    bool public deprecated;
    string public contactInformation = 'contact@mahadao.com';
    string public reason;
    string public link = 'https://mahadao.com';
    string public url = 'https://mahadao.com';
    string public website = 'https://mahadao.io';

    constructor() ERC20('MahaDAO', 'MAHA') {}
}
