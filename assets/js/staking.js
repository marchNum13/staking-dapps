document.addEventListener('DOMContentLoaded', () => {
    // --- STATE & CONFIG (Sama seperti dashboard.js) ---
    let provider, signer, userAddress, chronoLockContract, stakingContract, contractsConfig;
    const TARGET_NETWORK = { chainId: '0x38', chainName: 'BNB Smart Chain' };
    const CHRONOLOCK_CONTRACT_ADDRESS = "0x2b1eb2Ca46eB3c792A409D7EEa47E6883b6B62Eb";
    const STAKING_CONTRACT_ADDRESS = "0x6285d79C5cE92fa06B24fBa5e7ee1da167Fe10e9";

    // --- ELEMENT REFERENCES ---
    const userAddressEl = document.getElementById('userAddress');
    const poolCardsContainer = document.getElementById('pool-cards-container');
    const stakesListContainer = document.getElementById('stakes-list-container'); // Diubah dari stakesTableBody
    const noStakesMessage = document.getElementById('no-stakes-message');

    // Referensi dari template (sidebar, modal, dll)
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
        // Logika otentikasi & inisiasi provider (sama seperti dashboard.js)
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
            return showModal('Wrong Network', `Please switch to ${TARGET_NETWORK.chainName}.`, 'error');
        }

        signer = provider.getSigner();
        chronoLockContract = new ethers.Contract(CHRONOLOCK_CONTRACT_ADDRESS, contractsConfig.chronoLockABI, signer);
        stakingContract = new ethers.Contract(STAKING_CONTRACT_ADDRESS, contractsConfig.stakingABI, signer);

        // --- LOAD PAGE-SPECIFIC DATA ---
        await loadPageData();
        setupEventListeners();
    };

    const loadPageData = async () => {
        await Promise.all([
            fetchPoolsAndRender(),
            fetchUserStakesAndRender()
        ]);
    };

    // --- RENDER FUNCTIONS ---
    const fetchPoolsAndRender = async () => {
        try {
            poolCardsContainer.innerHTML = ''; // Clear spinner
            for (let i = 0; i < 3; i++) { // Asumsi ada 3 pool
                const pool = await stakingContract.stakingPools(i);
                const poolEl = document.createElement('div');
                poolEl.className = 'col-lg-4';
                poolEl.innerHTML = `
                    <div class="stake-pool-card">
                        <div class="pool-header">
                            <h4 class="pool-title">${pool.duration.toNumber() / 86400} Day Pool</h4>
                            <span class="pool-apr">APR: ${pool.apr.toNumber()}%</span>
                        </div>
                        <div class="pool-body">
                            <div class="mb-3">
                                <div class="d-flex justify-content-between mb-1">
                                    <label class="form-label">Amount to Stake</label>
                                    <span class="wallet-balance-label" id="balanceLabel-${i}">Balance: ... CLK</span>
                                </div>
                                <div class="input-group">
                                    <input type="number" class="form-control" id="stakeAmount-${i}" placeholder="0.00">
                                    <button class="btn btn-outline-secondary" type="button" id="maxBtn-${i}">Max</button>
                                </div>
                            </div>
                            <div class="estimated-reward" id="reward-${i}">Estimated Reward: 0.00 CLK</div>
                        </div>
                        <div class="pool-footer">
                            <button class="btn btn-secondary w-100 mb-2" id="approveBtn-${i}" data-original-text="Approve CLK" disabled>Approve CLK</button>
                            <button class="btn btn-primary w-100" id="stakeBtn-${i}" data-original-text="Stake" disabled>Stake</button>
                        </div>
                    </div>
                `;
                poolCardsContainer.appendChild(poolEl);
            }
            // Setelah render, update balance & tambahkan event listener
            updateBalancesAndListeners();
        } catch (error) {
            console.error("Error fetching pools:", error);
            poolCardsContainer.innerHTML = `<p class="text-danger">Could not load staking pools.</p>`;
        }
    };

    // FUNGSI INI TELAH DIPERBARUI UNTUK MENGGUNAKAN KARTU
    const fetchUserStakesAndRender = async () => {
        try {
            const stakes = await stakingContract.getStakes(userAddress);
            stakesListContainer.innerHTML = ''; // Clear previous entries
            if (stakes.length === 0) {
                noStakesMessage.classList.remove('d-none');
                return;
            }
            
            noStakesMessage.classList.add('d-none');
            stakes.forEach((stake, index) => {
                const card = document.createElement('div');
                card.className = 'stake-position-card';

                const isClaimed = stake.claimed;
                const isUnlocked = Date.now() / 1000 > stake.unlockTime.toNumber();
                
                let statusText, actionHtml, statusClass;
                if (isClaimed) {
                    statusText = `Claimed`;
                    statusClass = 'status-claimed';
                    actionHtml = `<button class="btn btn-outline-secondary" disabled>Unstaked</button>`;
                } else if (isUnlocked) {
                    statusText = `Ready to Claim`;
                    statusClass = 'status-unlocked';
                    actionHtml = `<button class="btn btn-success unstake-btn" data-index="${index}" data-original-text="Unstake">Unstake</button>`;
                } else {
                    statusText = `Locked`;
                    statusClass = 'status-locked';
                    actionHtml = `<button class="btn btn-secondary" disabled>Locked</button>`;
                }

                card.innerHTML = `
                    <div class="info-group">
                        <span class="info-label">Amount Staked</span>
                        <span class="info-value">${formatTokens(stake.amount)} CLK</span>
                    </div>
                    <div class="info-group">
                        <span class="info-label">Pool</span>
                        <span class="info-value">${stake.poolId.toNumber() === 0 ? '30' : stake.poolId.toNumber() === 1 ? '90' : '180'} Days</span>
                    </div>
                    <div class="info-group">
                        <span class="info-label">Unlocks In</span>
                        <span class="info-value" id="countdown-${index}">${isClaimed || isUnlocked ? 'Unlocked' : '...'}</span>
                    </div>
                    <div class="info-group">
                        <span class="info-label">Est. Reward</span>
                        <span class="info-value">${formatTokens(calculateRewardFrontend(stake.amount, stake.poolId))} CLK</span>
                    </div>
                    <div class="info-group">
                        <span class="info-label">Status</span>
                        <span class="info-value ${statusClass}">${statusText}</span>
                    </div>
                    <div class="action-group">
                        ${actionHtml}
                    </div>
                `;
                stakesListContainer.appendChild(card);

                if (!isClaimed && !isUnlocked) {
                    startCountdown(stake.unlockTime.toNumber(), `countdown-${index}`);
                }
            });
        } catch (error) {
            console.error("Error fetching user stakes:", error);
            noStakesMessage.textContent = 'Error loading your stakes.';
            noStakesMessage.classList.remove('d-none');
        }
    };


    // --- EVENT HANDLERS & LOGIC ---

    const updateBalancesAndListeners = async () => {
        const balance = await chronoLockContract.balanceOf(userAddress);
        for (let i = 0; i < 3; i++) {
            document.getElementById(`balanceLabel-${i}`).textContent = `Balance: ${formatTokens(balance)} CLK`;
            
            const amountInput = document.getElementById(`stakeAmount-${i}`);
            const approveBtn = document.getElementById(`approveBtn-${i}`);
            const stakeBtn = document.getElementById(`stakeBtn-${i}`);
            const maxBtn = document.getElementById(`maxBtn-${i}`);

            amountInput.addEventListener('input', async () => {
                const amount = amountInput.value;
                if (amount > 0) {
                    const amountWei = ethers.utils.parseUnits(amount, 18);
                    const allowance = await chronoLockContract.allowance(userAddress, STAKING_CONTRACT_ADDRESS);
                    
                    if (allowance.gte(amountWei)) {
                        approveBtn.disabled = true;
                        stakeBtn.disabled = false;
                    } else {
                        approveBtn.disabled = false;
                        stakeBtn.disabled = true;
                    }
                    // Update reward simulation
                    const reward = await stakingContract.calculateReward(amountWei, i);
                    document.getElementById(`reward-${i}`).textContent = `Estimated Reward: ${formatTokens(reward)} CLK`;
                } else {
                    approveBtn.disabled = true;
                    stakeBtn.disabled = true;
                    document.getElementById(`reward-${i}`).textContent = 'Estimated Reward: 0.00 CLK';
                }
            });

            maxBtn.addEventListener('click', () => {
                amountInput.value = ethers.utils.formatUnits(balance, 18);
                amountInput.dispatchEvent(new Event('input')); // Trigger input event
            });

            approveBtn.addEventListener('click', () => handleApprove(i));
            stakeBtn.addEventListener('click', () => handleStake(i));
        }
    };
    
    const handleApprove = async (poolId) => {
        const amount = document.getElementById(`stakeAmount-${poolId}`).value;
        const approveBtn = document.getElementById(`approveBtn-${poolId}`);
        if (!amount || amount <= 0) return showModal('Invalid Amount', 'Please enter a valid amount.', 'error');
        
        const amountWei = ethers.utils.parseUnits(amount, 18);
        setButtonLoading(approveBtn, true, 'Approving...');

        try {
            const tx = await chronoLockContract.approve(STAKING_CONTRACT_ADDRESS, amountWei);
            const receipt = await tx.wait();
            if(receipt.status === 1){
                showModal('Success', 'Approval successful! You can now stake your tokens.', 'success');
                approveBtn.disabled = true;
                document.getElementById(`stakeBtn-${poolId}`).disabled = false;
            } else {
                showModal('Transaction Failed', 'The approval transaction failed.', 'error');
            }
        } catch (err) {
            console.error("Approve error:", err);
            showModal('Transaction Failed', err.reason || 'An error occurred during approval.', 'error');
        } finally {
            setButtonLoading(approveBtn, false, 'Approve CLK');
        }
    };

    const handleStake = async (poolId) => {
        const amount = document.getElementById(`stakeAmount-${poolId}`).value;
        const stakeBtn = document.getElementById(`stakeBtn-${poolId}`);
        if (!amount || amount <= 0) return showModal('Invalid Amount', 'Please enter a valid amount.', 'error');
        
        const amountWei = ethers.utils.parseUnits(amount, 18);
        setButtonLoading(stakeBtn, true, 'Staking...');

        try {
            const tx = await stakingContract.stake(amountWei, poolId);
            const receipt = await tx.wait();
             if(receipt.status === 1){
                showModal('Success', 'You have successfully staked your tokens!', 'success');
                document.getElementById(`stakeAmount-${poolId}`).value = ''; // Reset input
                loadPageData(); // Refresh all data
            } else {
                 showModal('Transaction Failed', 'The staking transaction failed.', 'error');
            }
        } catch (err) {
            console.error("Stake error:", err);
            showModal('Transaction Failed', err.reason || 'An error occurred during staking.', 'error');
        } finally {
            setButtonLoading(stakeBtn, false, 'Stake');
            stakeBtn.disabled = true;
        }
    };
    
    // Event listener diperbarui untuk container kartu
    stakesListContainer.addEventListener('click', async (e) => {
        if (e.target.classList.contains('unstake-btn')) {
            const stakeIndex = e.target.dataset.index;
            setButtonLoading(e.target, true, 'Unstaking...');
            try {
                const tx = await stakingContract.unstake(stakeIndex);
                const receipt = await tx.wait();
                 if(receipt.status === 1){
                    showModal('Success', 'Unstaked successfully! Your tokens and rewards are back in your wallet.', 'success');
                    loadPageData(); // Refresh data
                } else {
                    showModal('Transaction Failed', 'The unstake transaction failed.', 'error');
                }
            } catch (err) {
                console.error("Unstake error:", err);
                showModal('Transaction Failed', err.reason || 'An error occurred during unstaking.', 'error');
            } finally {
                // Tidak perlu reset button loading karena elemennya akan di-render ulang
            }
        }
    });

    // --- HELPER FUNCTIONS ---
    async function loadConfig() {
        try {
            const response = await fetch('contracts.json');
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            contractsConfig = await response.json();
        } catch (e) { contractsConfig = null; console.error("Could not load config", e); showModal('Error', 'Could not load app configuration.'); }
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
    function formatTokens(amount) {
        if (!amount || !(amount instanceof ethers.BigNumber)) return '0.00';
        const formatted = ethers.utils.formatUnits(amount, 18);
        // Tampilkan lebih banyak desimal untuk jumlah kecil, format untuk jumlah besar
        if (parseFloat(formatted) < 0.01 && parseFloat(formatted) > 0) return parseFloat(formatted).toFixed(6);
        return parseFloat(formatted).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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
    
    let countdownIntervals = {};
    function startCountdown(unlockTimestamp, elementId) {
        if (countdownIntervals[elementId]) clearInterval(countdownIntervals[elementId]);

        const countdownElement = document.getElementById(elementId);
        if(!countdownElement) return;
        
        const interval = setInterval(() => {
            const now = Math.floor(Date.now() / 1000);
            const distance = unlockTimestamp - now;

            if (distance < 0) {
                clearInterval(interval);
                countdownElement.textContent = "Ready to claim";
                // Tidak perlu refresh di sini, biarkan tombol yang memicu
                return;
            }

            const days = Math.floor(distance / 86400);
            const hours = Math.floor((distance % 86400) / 3600);
            const minutes = Math.floor((distance % 3600) / 60);
            const seconds = Math.floor(distance % 60);

            countdownElement.textContent = `${days}d ${hours}h ${minutes}m ${seconds}s`;
        }, 1000);
        countdownIntervals[elementId] = interval;
    }
    
    const poolInfoCache = { 0: { apr: 12, duration: 30*86400 }, 1: { apr: 18, duration: 90*86400 }, 2: { apr: 25, duration: 180*86400 } };
    function calculateRewardFrontend(amount, poolId) {
        const SECONDS_IN_YEAR = 31536000; // 365 days
        const pool = poolInfoCache[poolId.toNumber()];
        if (!pool) return ethers.BigNumber.from(0);
        return amount.mul(pool.apr).mul(pool.duration).div(SECONDS_IN_YEAR).div(100);
    }

    function setupEventListeners() {
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

    initializeApp();
});

