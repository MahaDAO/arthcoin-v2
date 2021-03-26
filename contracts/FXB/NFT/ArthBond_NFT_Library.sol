// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;
pragma experimental ABIEncoderV2;

import '../../ERC721/V8_0_0/Math/SafeMath.sol';

/**
 *  Original code written by:
 *  - Travis Moore, Jason Huan, Same Kazemian.
 */
library ArthBond_NFT_Library {
    using SafeMath for uint256;

    function uint2str(uint256 _i) public pure returns (string memory str) {
        if (_i == 0) return '0';
        uint256 j = _i;
        uint256 length;
        while (j != 0) {
            length++;
            j /= 10;
        }
        bytes memory bstr = new bytes(length);
        uint256 k = length;
        j = _i;
        while (j != 0) {
            bstr[--k] = bytes1(uint8(48 + (j % 10)));
            j /= 10;
        }
        str = string(bstr);
    }

    function compare(string memory s1, string memory s2)
        public
        pure
        returns (bool)
    {
        return
            keccak256(abi.encodePacked(s1)) == keccak256(abi.encodePacked(s2));
    }

    function concatenate(string memory s1, string memory s2)
        public
        pure
        returns (string memory)
    {
        return string(abi.encodePacked(s1, s2));
    }

    function concatenate3(
        string memory s1,
        string memory s2,
        string memory s3
    ) public pure returns (string memory) {
        return string(abi.encodePacked(s1, s2, s3));
    }

    function arthb_namer(
        string memory series,
        uint256 face_value_e18,
        uint256 maturity_months
    ) public pure returns (string memory) {
        // Example: Arth Finance Bond Series A 100000 3 Month
        return
            string(
                abi.encodePacked(
                    'Arth Finance Bond Series ',
                    series,
                    ' ',
                    uint2str(face_value_e18.div(1e18)),
                    ' ',
                    uint2str(maturity_months),
                    ' Month'
                )
            );
    }

    function arthb_symboler(
        string memory series,
        uint256 face_value_e18,
        uint256 maturity_months
    ) public pure returns (string memory) {
        // Example: ARTHBA100000M3
        return
            string(
                abi.encodePacked(
                    'ARTHB',
                    series,
                    uint2str(face_value_e18.div(1e18)),
                    'M',
                    uint2str(maturity_months)
                )
            );
    }
}
