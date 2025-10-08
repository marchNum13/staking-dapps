document.addEventListener('DOMContentLoaded', () => {
    // --- STATE & CONFIG ---
    let provider, signer, userAddress, chronoLockContract, contractsConfig;
    const TARGET_NETWORK = { chainId: '0x38', chainName: 'BNB Smart Chain' };
    const CHRONOLOCK_CONTRACT_ADDRESS = "0x2b1eb2Ca46eB3c792A409D7EEa47E6883b6B62Eb";

    // --- ELEMENT REFERENCES ---
    const userAddressEl = document.getElementById('userAddress');
    const mintBtn = document.getElementById('mintBtn');
    const faucetStatus = document.getElementById('faucet-status');
    
    // Common elements from template
    const disconnectBtn = document.getElementById('disconnectBtn');
    const disconnectBtnSidebar = document.getElementById('disconnectBtnSidebar');
    const modalOverlay = document.getElementById('modalOverlay');
    const modalHeader = document.getElementById('modalHeader');
    const modalTitle = document.getElementById('modalTitle');
    const modalMessage = document.getElementById('modalMessage');
    const modalCloseBtn = document.getElementById('modalCloseBtn');
    const sidebar = document.getElementById('sidebar');
    const sidebarOverlay = document.getElementById('sidebarOverlay');
    const sidebarToggleBtn = document.getElementById('sidebarToggleBtn');
    const sidebarCloseBtn = document.getElementById('sidebarCloseBtn');

    // --- INITIALIZATION ---
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
            return showModal('Wallet Error', 'Please install a Web3 wallet like MetaMask.', 'error');
        }

        provider = new ethers.providers.Web3Provider(window.ethereum);
        const network = await provider.getNetwork();
        if (network.chainId !== parseInt(TARGET_NETWORK.chainId, 16)) {
            mintBtn.disabled = true;
            return showModal('Wrong Network', `Please switch to ${TARGET_NETWORK.chainName} to use the faucet.`, 'error');
        }

        signer = provider.getSigner();
        chronoLockContract = new ethers.Contract(CHRONOLOCK_CONTRACT_ADDRESS, contractsConfig.chronoLockABI, signer);

        setupEventListeners();
    };

    // --- EVENT HANDLERS & LOGIC ---
    const handleMint = async () => {
        setButtonLoading(mintBtn, true, 'Minting...');
        faucetStatus.textContent = 'Preparing transaction... Please confirm in your wallet.';
        faucetStatus.className = 'faucet-status status-info';
        
        try {
            const tx = await chronoLockContract.mint(userAddress);
            faucetStatus.textContent = 'Transaction submitted, waiting for confirmation...';
            const receipt = await tx.wait();

            if (receipt.status === 1) {
                showModal('Success!', '10,000 CLK have been successfully minted to your wallet.', 'success');
                faucetStatus.textContent = 'Minting successful! Check your wallet balance.';
                faucetStatus.className = 'faucet-status status-success';
            } else {
                throw new Error('Transaction failed on the blockchain.');
            }
        } catch (err) {
            console.error("Minting error:", err);
            const errorMessage = err.reason || 'An unknown error occurred.';
            showModal('Minting Failed', errorMessage, 'error');
            faucetStatus.textContent = `Error: ${errorMessage}`;
            faucetStatus.className = 'faucet-status status-error';
        } finally {
            setButtonLoading(mintBtn, false, 'Mint 10,000 CLK');
        }
    };

    function setupEventListeners() {
        mintBtn.addEventListener('click', handleMint);

        // Common event listeners
        disconnectBtn.addEventListener('click', disconnectWallet);
        disconnectBtnSidebar.addEventListener('click', disconnectWallet);
        modalCloseBtn.addEventListener('click', hideModal);
        modalOverlay.addEventListener('click', (e) => { if (e.target === modalOverlay) hideModal(); });
        sidebarToggleBtn.addEventListener('click', toggleSidebar);
        sidebarCloseBtn.addEventListener('click', toggleSidebar);
        sidebarOverlay.addEventListener('click', toggleSidebar);
        
        if (window.ethereum) {
            window.ethereum.on('accountsChanged', () => window.location.reload());
            window.ethereum.on('chainChanged', () => window.location.reload());
        }
    }

    // --- HELPER FUNCTIONS ---
    async function loadConfig() {
        try {
            const response = await fetch('contracts.json');
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            contractsConfig = await response.json();
        } catch (e) {
            contractsConfig = null;
            console.error("Could not load config", e);
            showModal('Error', 'Could not load app configuration.');
        }
    }

    function disconnectWallet() {
        localStorage.removeItem('walletConnected');
        localStorage.removeItem('userAddress');
        window.location.href = 'index.html';
    }

    function toggleSidebar() {
        sidebar.classList.toggle('open');
        sidebarOverlay.classList.toggle('open');
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

    function setButtonLoading(button, isLoading, loadingText) {
        button.disabled = isLoading;
        const originalText = button.dataset.originalText;
        if (isLoading) {
            button.innerHTML = `<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> ${loadingText}`;
        } else {
            button.innerHTML = originalText;
        }
    }

    initializeApp();
});