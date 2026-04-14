// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title ProofOfIntent
 * @notice Soulbound ERC-721 NFT minted for every intent posted on Manifest.
 *         Non-transferable. Only the contract owner (deployer wallet) can mint.
 *         Each token stores the intent ID and poster's address in metadata.
 */
contract ProofOfIntent is ERC721, Ownable {
    uint256 private _nextTokenId;
    string private _baseTokenURI;

    // Mapping from token ID to intent metadata
    mapping(uint256 => string) private _intentIds;

    event IntentMinted(uint256 indexed tokenId, address indexed to, string intentId);

    constructor(
        string memory baseURI
    ) ERC721("Proof of Intent", "POI") Ownable(msg.sender) {
        _baseTokenURI = baseURI;
    }

    /**
     * @notice Mint a Proof of Intent NFT to a user. Only callable by owner.
     * @param to The address to receive the NFT
     * @param intentId The off-chain intent ID from the database
     */
    function mint(address to, string calldata intentId) external onlyOwner returns (uint256) {
        uint256 tokenId = _nextTokenId++;
        _safeMint(to, tokenId);
        _intentIds[tokenId] = intentId;
        emit IntentMinted(tokenId, to, intentId);
        return tokenId;
    }

    /**
     * @notice Get the intent ID associated with a token
     */
    function intentIdOf(uint256 tokenId) external view returns (string memory) {
        _requireOwned(tokenId);
        return _intentIds[tokenId];
    }

    /**
     * @notice Get the total number of minted tokens
     */
    function totalSupply() external view returns (uint256) {
        return _nextTokenId;
    }

    /**
     * @notice Update the base URI for token metadata
     */
    function setBaseURI(string memory baseURI) external onlyOwner {
        _baseTokenURI = baseURI;
    }

    function _baseURI() internal view override returns (string memory) {
        return _baseTokenURI;
    }

    // ── Soulbound: disable all transfers ──

    function transferFrom(address, address, uint256) public pure override {
        revert("ProofOfIntent: soulbound, non-transferable");
    }

    function safeTransferFrom(address, address, uint256, bytes memory) public pure override {
        revert("ProofOfIntent: soulbound, non-transferable");
    }

    function approve(address, uint256) public pure override {
        revert("ProofOfIntent: soulbound, non-transferable");
    }

    function setApprovalForAll(address, bool) public pure override {
        revert("ProofOfIntent: soulbound, non-transferable");
    }
}
