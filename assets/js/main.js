// This script will handle wallet connection and user authentication.

document.addEventListener('DOMContentLoaded', () => {
    // --- Element References ---
    const connectWalletBtn = document.getElementById('connectWalletBtn');
    
    // Modal Elements
    const modalOverlay = document.getElementById('modalOverlay');
    const modalHeader = document.getElementById('modalHeader');
    const modalTitle = document.getElementById('modalTitle');
    const modalMessage = document.getElementById('modalMessage');
    const modalCloseBtn = document.getElementById('modalCloseBtn');


    // --- Configuration for BNB Smart Chain ---
    const bscMainnet = {
        chainId: '0x38', // 56 in decimal
        chainName: 'BNB Smart Chain',
        nativeCurrency: {
            name: 'BNB',
            symbol: 'BNB',
            decimals: 18,
        },
        rpcUrls: ['https://bsc-dataseed.binance.org/'],
        blockExplorerUrls: ['https://bscscan.com/'],
    };

    // Check if the user was previously connected
    checkConnection();

    // --- Event Listeners ---
    connectWalletBtn.addEventListener('click', handleConnectWallet);
    modalCloseBtn.addEventListener('click', hideModal);
    modalOverlay.addEventListener('click', (event) => {
        if (event.target === modalOverlay) {
            hideModal();
        }
    });


    // --- Main Functions ---

    /**
     * Handles the entire wallet connection flow.
     */
    async function handleConnectWallet() {
        connectWalletBtn.disabled = true;
        connectWalletBtn.textContent = 'Connecting...';

        try {
            if (typeof window.ethereum === 'undefined') {
                throw new Error('Wallet not detected. Please install Wallet.');
            }

            const provider = new ethers.providers.Web3Provider(window.ethereum);
            const accounts = await provider.send('eth_requestAccounts', []);
            const account = accounts[0];
            
            const network = await provider.getNetwork();
            if (network.chainId !== parseInt(bscMainnet.chainId, 16)) {
                console.log('Wrong network, attempting to switch...');
                const switched = await switchToBscNetwork(provider);
                if (!switched) return; // Stop if switch fails/is rejected
            }

            console.log('Wallet connected on BNB Smart Chain:', account);
            localStorage.setItem('walletConnected', 'true');
            localStorage.setItem('userAddress', account);
            window.location.href = 'dashboard.html';

        } catch (error) {
            console.error('Connection process failed:', error);
            showModal('Connection Failed', error.message || 'An unknown error occurred. Please try again.', 'error');
        } finally {
            connectWalletBtn.disabled = false;
            connectWalletBtn.textContent = 'Connect Wallet';
        }
    }

    /**
     * Tries to switch the user's wallet to the BNB Smart Chain.
     * @param {ethers.providers.Web3Provider} provider - The Ethers provider instance.
     * @returns {Promise<boolean>} True if successful, false otherwise.
     */
    async function switchToBscNetwork(provider) {
        try {
            await provider.send('wallet_switchEthereumChain', [{ chainId: bscMainnet.chainId }]);
            return true;
        } catch (switchError) {
            if (switchError.code === 4902) {
                try {
                    await provider.send('wallet_addEthereumChain', [bscMainnet]);
                    return true;
                } catch (addError) {
                    console.error('Failed to add BSC network:', addError);
                    showModal('Network Error', 'Failed to add the BNB Smart Chain network to Wallet.', 'error');
                    return false;
                }
            }
            console.error('Failed to switch network:', switchError);
            showModal('Network Error', 'Failed to switch network. Please change it manually in Wallet.', 'error');
            return false;
        }
    }

    /**
     * Checks for a previous connection and redirects if found.
     */
    function checkConnection() {
        if (localStorage.getItem('walletConnected') === 'true') {
             console.log('User already connected, redirecting to dashboard...');
             window.location.href = 'dashboard.html';
        }
    }

    // --- Modal Helper Functions ---

    /**
     * Displays the modal with a custom message and type.
     * @param {string} title - The title for the modal header.
     * @param {string} message - The main content of the modal.
     * @param {string} type - 'error', 'success', or 'info'.
     */
    function showModal(title, message, type = 'info') {
        modalTitle.textContent = title;
        modalMessage.textContent = message;

        // Reset header classes
        modalHeader.classList.remove('modal__header--error', 'modal__header--success', 'modal__header--info');
        
        // Add class based on type
        if (type === 'error') {
            modalHeader.classList.add('modal__header--error');
        } else if (type === 'success') {
            modalHeader.classList.add('modal__header--success');
        } else {
            modalHeader.classList.add('modal__header--info');
        }

        modalOverlay.classList.add('show');
    }

    /**
     * Hides the modal.
     */
    function hideModal() {
        modalOverlay.classList.remove('show');
    }
});