document.addEventListener('DOMContentLoaded', () => {
    // --- STATE VARIABLES ---
    let provider;
    let signer;
    let userAddress;
    let chronoLockContract;
    let stakingContract;
    let contractsConfig;

    // --- CONFIGURATION ---
    const TARGET_NETWORK = {
        chainId: '0x38', // 56 in decimal for BNB Smart Chain Mainnet
        chainName: 'BNB Smart Chain',
        nativeCurrency: { name: 'BNB', symbol: 'BNB', decimals: 18 },
        rpcUrls: ['https://bsc-dataseed.binance.org/'],
        blockExplorerUrls: ['https://bscscan.com/'],
    };

    // --- CONTRACT ADDRESSES (UPDATE THESE FOR MAINNET) ---
    const CHRONOLOCK_CONTRACT_ADDRESS = "0x2b1eb2Ca46eB3c792A409D7EEa47E6883b6B62Eb"; // Replace with your MAINNET address
    const STAKING_CONTRACT_ADDRESS = "0x6285d79C5cE92fa06B24fBa5e7ee1da167Fe10e9"; // Replace with your MAINNET address

    // --- ELEMENT REFERENCES ---
    const userAddressEl = document.getElementById('userAddress');
    const disconnectBtn = document.getElementById('disconnectBtn');
    const disconnectBtnSidebar = document.getElementById('disconnectBtnSidebar');
    const walletBalanceEl = document.getElementById('walletBalance');
    const totalStakedEl = document.getElementById('totalStaked');
    const activeStakesEl = document.getElementById('activeStakes');
    const platformTvlEl = document.getElementById('platformTvl');
    
    // Modal Elements
    const modalOverlay = document.getElementById('modalOverlay');
    const modalHeader = document.getElementById('modalHeader');
    const modalTitle = document.getElementById('modalTitle');
    const modalMessage = document.getElementById('modalMessage');
    const modalCloseBtn = document.getElementById('modalCloseBtn');

    // Sidebar Elements
    const sidebar = document.getElementById('sidebar');
    const sidebarOverlay = document.getElementById('sidebarOverlay');
    const sidebarToggleBtn = document.getElementById('sidebarToggleBtn');
    const sidebarCloseBtn = document.getElementById('sidebarCloseBtn');

    /**
     * Main initialization function
     */
    const initializeApp = async () => {
        userAddress = localStorage.getItem('userAddress');
        if (!userAddress || localStorage.getItem('walletConnected') !== 'true') {
            window.location.href = 'index.html';
            return;
        }
        
        userAddressEl.textContent = `${userAddress.substring(0, 6)}...${userAddress.substring(userAddress.length - 4)}`;

        await loadConfig();
        if (!contractsConfig) return;

        if (typeof window.ethereum === 'undefined') {
            showModal('Wallet Error', 'Wallet not detected. Please install a Web3 wallet like MetaMask.', 'error');
            return;
        }

        provider = new ethers.providers.Web3Provider(window.ethereum);
        
        // --- NETWORK CHECK ---
        const network = await provider.getNetwork();
        if (network.chainId !== parseInt(TARGET_NETWORK.chainId, 16)) {
            showModal('Wrong Network', `Please switch your wallet to the ${TARGET_NETWORK.chainName} to use this dApp.`, 'error');
            // Display error in UI instead of spinners
            walletBalanceEl.textContent = 'Wrong Network';
            totalStakedEl.textContent = 'Wrong Network';
            activeStakesEl.textContent = 'Wrong Network';
            platformTvlEl.textContent = 'Wrong Network';
            return; // Stop further execution
        }
        // --- END OF NETWORK CHECK ---

        signer = provider.getSigner();

        try {
            chronoLockContract = new ethers.Contract(CHRONOLOCK_CONTRACT_ADDRESS, contractsConfig.chronoLockABI, signer);
            stakingContract = new ethers.Contract(STAKING_CONTRACT_ADDRESS, contractsConfig.stakingABI, signer);
        } catch (error) {
            console.error("Failed to instantiate contracts:", error);
            showModal('Contract Error', 'Could not connect to smart contracts.', 'error');
            return;
        }
        
        await fetchDashboardData();
        setupEventListeners();
    };

    /**
     * Fetches the ABI configurations from the JSON file.
     */
    async function loadConfig() {
        try {
            const response = await fetch('contracts.json');
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            contractsConfig = await response.json();
        } catch (error) {
            console.error("Could not load contracts.json:", error);
            showModal('Configuration Error', 'Failed to load dApp configuration.', 'error');
            contractsConfig = null;
        }
    }

    /**
     * Fetches all necessary data for the dashboard and updates the UI.
     */
    async function fetchDashboardData() {
        try {
            const balance = await chronoLockContract.balanceOf(userAddress);
            walletBalanceEl.textContent = formatTokens(balance);

            const userStakes = await stakingContract.getStakes(userAddress);
            let totalUserStaked = ethers.BigNumber.from(0);
            let activePositions = 0;
            userStakes.forEach(stake => {
                if (!stake.claimed) {
                    totalUserStaked = totalUserStaked.add(stake.amount);
                    activePositions++;
                }
            });
            totalStakedEl.textContent = formatTokens(totalUserStaked);
            activeStakesEl.textContent = activePositions;

            const tvl = await stakingContract.totalStaked();
            platformTvlEl.textContent = formatTokens(tvl);

        } catch (error) {
            console.error("FAILED TO FETCH DASHBOARD DATA:", error);
            showModal('Data Error', 'Could not fetch data from the blockchain. Ensure you are on the correct network and refresh.', 'error');
            walletBalanceEl.textContent = 'Error';
            totalStakedEl.textContent = 'Error';
            activeStakesEl.textContent = 'Error';
            platformTvlEl.textContent = 'Error';
        }
    }
    
    /**
     * Sets up event listeners for the page
     */
    function setupEventListeners() {
        disconnectBtnSidebar.addEventListener('click', disconnectWallet);
        disconnectBtn.addEventListener('click', disconnectWallet);
        modalCloseBtn.addEventListener('click', hideModal);
        modalOverlay.addEventListener('click', (event) => {
            if (event.target === modalOverlay) hideModal();
        });

        // Sidebar event listeners
        sidebarToggleBtn.addEventListener('click', toggleSidebar);
        sidebarCloseBtn.addEventListener('click', toggleSidebar);
        sidebarOverlay.addEventListener('click', toggleSidebar);

        if (window.ethereum) {
            window.ethereum.on('accountsChanged', (accounts) => {
                if (accounts.length === 0) {
                    disconnectWallet();
                } else {
                    localStorage.setItem('userAddress', accounts[0]);
                    initializeApp();
                }
            });

            // Listen for network changes
            window.ethereum.on('chainChanged', (_chainId) => {
                // Reload the page to re-check the network
                window.location.reload();
            });
        }
    }

    function disconnectWallet() {
        localStorage.removeItem('walletConnected');
        localStorage.removeItem('userAddress');
        window.location.href = 'index.html';
    }

    /**
     * Toggles the visibility of the sidebar.
     */
    function toggleSidebar() {
        sidebar.classList.toggle('open');
        sidebarOverlay.classList.toggle('open');
    }

    function formatTokens(amount) {
        if (!amount || !(amount instanceof ethers.BigNumber)) return '0.00';
        const formatted = ethers.utils.formatUnits(amount, 18);
        const parts = formatted.split('.');
        const integerPart = parts[0];
        const decimalPart = parts[1] ? parts[1].slice(0, 2) : '00';
        return `${integerPart}.${decimalPart}`;
    }

    function showModal(title, message, type = 'info') {
        modalTitle.textContent = title;
        modalMessage.textContent = message;
        modalHeader.className = 'modal-header';
        modalHeader.classList.add(`modal-header--${type}`);
        modalOverlay.classList.add('show');
    }

    function hideModal() {
        modalOverlay.classList.remove('show');
    }

    initializeApp();
});