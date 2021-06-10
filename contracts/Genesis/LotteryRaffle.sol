// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import {SafeMath} from '../utils/math/SafeMath.sol';
import {ILotteryRaffle} from './ILotteryRaffle.sol';

contract Raffles is ERC721URIStorage, ILotteryRaffle, AccessControl {
    using SafeMath for uint256;

    uint256 public tokenCounter;
    mapping(address => uint256) public usersLotteries;

    modifier onlyAdmin() {
        require(
            hasRole(DEFAULT_ADMIN_ROLE, _msgSender()),
            'LotteryRaffle: You are not the admin'
        );
        _;
    }

    constructor()  ERC721("Maha Raffle", "LOT") {
        tokenCounter = 0;
        _setupRole(DEFAULT_ADMIN_ROLE, _msgSender());
    }

    function rewardLottery(address _to, uint256 _amount)
        public
        override
    {
        for(uint256 i = 1; i <= _amount; i++) {
            tokenCounter = tokenCounter.add(1);
            usersLotteries[_to] = usersLotteries[_to].add(1);
            _safeMint(_to, tokenCounter);
            _setTokenURI(tokenCounter, "https://ipfs.io/ipfs/QmNdmSamXQ1LyyhEWAWk4ez1tRhBbyDKNbkdJUwV28nAZ9");
        }
    }

    function getTokenCounts() public view override returns (uint256){
        return tokenCounter;
    }

    function tokenIdOwner(uint256 _id) public view override returns (address){
        return ownerOf(_id);
    }

    function usersLottery(address _address) public view override returns (uint256) {
        return usersLotteries[_address];
    }

    function onERC721Received(address, address, uint256, bytes memory) public virtual returns (bytes4) {
        return this.onERC721Received.selector;
    }

    function supportsInterface(bytes4 interfaceId) public view virtual override(ERC721, AccessControl) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
