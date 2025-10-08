// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title ChronoLock Token (CLK)
 * @notice This contract implements a capped ERC20 token with minting capabilities.
 * - Maximum total supply is capped at 10,000,000 tokens.
 * - Tokens are not pre-minted at deployment; they can be minted by anyone
 * via the public mint() function (faucet), which gives a fixed amount.
 * - It uses the default 18 decimals from the OpenZeppelin ERC20 contract.
 */
contract ChronoLock is ERC20, Ownable {
    /// @notice Maximum supply (10 million tokens with 18 decimals).
    uint256 public constant MAX_SUPPLY = 10_000_000 * 1e18;
    /// @notice The fixed amount of tokens minted per call to the mint function.
    uint256 public constant MINT_AMOUNT = 10_000 * 1e18;

    /// @notice Emitted when new tokens are minted.
    event Minted(address indexed to, uint256 amount);
    /// @notice Emitted when tokens are burned.
    event Burned(address indexed from, uint256 amount);

    /// @notice Custom error when trying to exceed the maximum supply.
    error MaxSupplyExceeded();

    /**
     * @notice Initializes the ERC20 token.
     * @param initialOwner Address of the contract owner.
     */
    constructor(address initialOwner) ERC20("ChronoLock", "CLK") Ownable(initialOwner) {}

    /**
     * @notice Mints a fixed amount of 10,000 new tokens to a specified address.
     * @dev Callable by anyone. This function acts as a public faucet.
     * Reverts if total supply exceeds MAX_SUPPLY.
     * @param to Address receiving the minted tokens.
     */
    function mint(address to) external {
        if (totalSupply() + MINT_AMOUNT > MAX_SUPPLY) revert MaxSupplyExceeded();
        _mint(to, MINT_AMOUNT);
        emit Minted(to, MINT_AMOUNT);
    }

    /**
     * @notice Destroys a specified amount of tokens from a given address.
     * @dev Can only be called by the contract owner. This reduces the total supply.
     * @param from The address to burn tokens from.
     * @param amount The number of tokens to burn.
     */
    function burn(address from, uint256 amount) external onlyOwner {
        _burn(from, amount);
        emit Burned(from, amount);
    }
}