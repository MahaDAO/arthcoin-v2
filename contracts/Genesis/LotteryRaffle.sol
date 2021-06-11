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
    uint256 public prizeCounter;

    struct NftPrizeDetails {
        string description;
        address nftAddress;
        uint256 tokenId;
        string image;
        address winner;
    }

    mapping(address => uint256) public usersLotteries;
    mapping(string => NftPrizeDetails) public prizes;

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

    function setPrizes(
        string memory _prize,
        string memory _description,
        address _nftAddress,
        uint256 _nftId,
        string memory image
    ) public onlyAdmin {
        prizeCounter = prizeCounter.add(1);
        prizes[_prize] = NftPrizeDetails(_description, _nftAddress, _nftId, image, address(0));
    }

    function setWinner(string memory _prize, uint256 _tokenId) public onlyAdmin {
        NftPrizeDetails memory _nftDetails = prizes[_prize];

        address _tokenOwner = tokenIdOwner(_tokenId);
        _nftDetails.winner = _tokenOwner;

        prizes[_prize] = _nftDetails;
    }

    function rewardLottery(address _to, uint256 _amount)
        public
        override
        onlyAdmin
    {
        for (uint256 i = 1; i <= _amount; i++) {
            tokenCounter = tokenCounter.add(1);
            usersLotteries[_to] = usersLotteries[_to].add(1);
            _safeMint(_to, tokenCounter);
        }
    }

    function checkResult(string memory _prize) public view returns (bool) {
        NftPrizeDetails memory _nftDetails = prizes[_prize];

        if (_nftDetails.winner == msg.sender) {
            return true;
        } else {
            return false;
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
