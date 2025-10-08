# **ChronoLock \- Staking dApp**
**ChronoLock** is a fully functional Decentralized Application (dApp) for token staking, built as a showcase project to demonstrate the end-to-end integration between blockchain smart contracts and a modern, responsive user interface.

This application enables users to stake **ChronoLock** **(CLK)** tokens for various time periods, earning rewards based on a predetermined Annual Percentage Rate (APR).

## **🚀 Key Features**
* **Wallet Integration:** Seamless connection with Web3 wallets like MetaMask for user authentication.  
* **Interactive Dashboard:** Displays a summary of key statistics such as token balance, total staked amount, and the platform's Total Value Locked (TVL) in real-time.  
* **Multi-Pool Staking:** Three distinct staking pools with different durations and APRs (30 days @ 12%, 90 days @ 18%, 180 days @ 25%).  
* **Reward Simulation:** Reward estimates are calculated and displayed instantly before a user stakes their tokens.  
* **Approve & Stake Process:** A secure, two-step transaction flow compliant with the ERC20 token standard.  
* **Staking Position Management:** Users can view all their staking positions, complete with a countdown timer to the unlock time.  
* **Token Faucet:** A dedicated page to get free test CLK tokens, facilitating easy testing and demonstration.  
* **Responsive Design:** A user interface optimized for various screen sizes, from desktops to mobile devices, featuring a mobile-friendly sidebar navigation.

## **🛠️ Tech Stack**

### **Smart Contracts (Backend)**
* **Solidity ^0.8.20** — The primary language for writing smart contracts.  
* **OpenZeppelin Contracts** — Used for secure and standard ERC20 token implementation.  
* **Hardhat/Remix** — Development environments for compiling, deploying, and testing smart contracts.

### **User Interface (Frontend)**
* **HTML5 & CSS3** — For the basic structure and styling of the web pages.  
* **Vanilla JavaScript** — Core client-side logic written without a framework to demonstrate fundamental concepts.  
* **Ethers.js v5.7.2** — A library for interacting with Ethereum-like blockchains and smart contracts from the frontend.  
* **Bootstrap 5** — A CSS framework for ensuring a responsive layout and consistent UI components.  
* **Font Awesome** — Used for iconography throughout the application.

## **🔧 Installation & Setup Guide**
To run this project in your local environment, follow these steps:

### **Prerequisites**
1. **A Web3-enabled browser**, Such as [MetaMask](https://metamask.io/).  
2. **A Live Server**: An extension for Visual Studio Code or any other local web server to serve the HTML files.

### **Steps**
1. **Clone the Repository**  
    ```
    git clone https://github.com/your-username/your-repo-name.git  
    cd your-repo-name
    ```
2. **Deploy the Smart Contracts**  
   * Deploy the **ChronoLock.sol** and **Staking.sol** Contracts to your preferred blockchain network (e.g., BNB Smart Chain Mainnet or Testnet).  
   * Ensure that you save the deployed addresses of both contracts. 
3. **Configure Contract Addresses**  
   * Open the following JavaScript files: **assets/js/dashboard.js**, **assets/js/staking.js**, and **assets/js/faucet.js**.  
   * Replace the placeholder contract addresses with the ones you obtained in the previous step.
    ```
    const CHRONOLOCK_CONTRACT_ADDRESS = "YOUR_CHRONOLOCK_CONTRACT_ADDRESS";  
    const STAKING_CONTRACT_ADDRESS = "YOUR_STAKING_CONTRACT_ADDRESS";
    ```
   * Also, ensure the **TARGET\_NETWORK** variable matches the network you deployed to.  
4. **Prepare the ABI File**  
   * Copy the ABIs (Application Binary Interface) from **ChronoLock.sol** and **Staking.sol** into the **contracts.json** file located in the project's root directory. The structure should be as follows:
    ```
    {  
        "chronoLockABI": [ ... ABI for ChronoLock ... ],  
        "stakingABI": [ ... ABI for Staking ... ]  
    }
    ```
5. **Run the Application**  
   * Open the index.html file using a Live Server or by accessing it through your local web server.  
   * Connect your MetaMask wallet (ensuring it's on the correct network) and start using the dApp.

## **📁 Project Structure**
```
.  
├── assets/  
│   ├── css/  
│   │   └── style.css         \# Custom styles  
│   └── js/  
│       ├── index.js          \# Logic for the connect page  
│       ├── dashboard.js      \# Logic for the dashboard page  
│       ├── staking.js        \# Logic for the staking page  
│       └── faucet.js         \# Logic for the faucet page  
│  
├── contracts/  
│   ├── ChronoLock.sol        \# ERC20 token smart contract  
│   └── Staking.sol           \# Staking logic smart contract  
│  
├── index.html                \# Wallet connect page  
├── dashboard.html            \# Dashboard page  
├── staking.html              \# Staking page  
├── faucet.html               \# Faucet page  
├── contracts.json            \# Contains the ABIs for the smart contracts  
└── README.md                 \# Project documentation
```
## **📄 License**
> This project is licensed under the MIT License. See the LICENSE file for details.