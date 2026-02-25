// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

interface IERC20Minimal {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(
        address from,
        address to,
        uint256 amount
    ) external returns (bool);
}

contract EscrowMarketplace {
    enum EscrowState {
        Created,
        Funded,
        SettlementRequested,
        Disputed,
        Settled,
        Released,
        Cancelled
    }

    struct Escrow {
        bytes32 key;
        address merchant;
        address agent;
        address asset;
        uint256 amount;
        uint256 fundedAt;
        uint256 expiry;
        uint64 holdDuration;
        EscrowState state;
        bool agentRequestedSettlement;
        bool agentRaisedDispute;
    }

    event SettlementRequested(bytes32 indexed key, address indexed agent);
    event SettlementFinalized(bytes32 indexed key, address indexed merchant, bool payMerchant);

    address public owner;
    mapping(bytes32 => Escrow) private escrows;
    mapping(bytes32 => bool) private exists;

    mapping(address => bool) public isFacilitator;

    mapping(address => uint256) public lockedForMerchant;
    mapping(bytes32 => uint256) public lockedForResource;

    uint256 private unlocked = 1;

    modifier nonReentrant() {
        require(unlocked == 1, "ReentrancyGuard: locked");
        unlocked = 0;
        _;
        unlocked = 1;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "only owner");
        _;
    }

    modifier onlyFacilitator() {
        require(isFacilitator[msg.sender], "only facilitator");
        _;
    }

    modifier escrowExists(bytes32 key) {
        require(exists[key], "escrow:not exist");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    function addFacilitator(address account) external onlyOwner {
        require(account != address(0), "zero addr");
        isFacilitator[account] = true;
    }

    function removeFacilitator(address account) external onlyOwner {
        isFacilitator[account] = false;
    }

    // ---------------------------------------------------------
    // Create Escrow
    // ---------------------------------------------------------

    function createEscrow(
        bytes32 key,
        address merchant,
        address agent,
        address asset,
        uint256 amount,
        uint64 holdDuration
    ) external {
        require(!exists[key], "key exists");
        require(merchant != address(0), "merchant zero");
        require(agent != address(0), "agent zero");
        require(amount > 0, "amount zero");

        require(
            msg.sender == owner ||
                msg.sender == merchant ||
                isFacilitator[msg.sender],
            "not allowed"
        );

        escrows[key] = Escrow({
            key: key,
            merchant: merchant,
            agent: agent,
            asset: asset,
            amount: amount,
            fundedAt: 0,
            expiry: 0,
            holdDuration: holdDuration,
            state: EscrowState.Created,
            agentRequestedSettlement: false,
            agentRaisedDispute: false
        });

        exists[key] = true;
    }

    // ---------------------------------------------------------
    // Deposit
    // ---------------------------------------------------------

    function deposit(
        bytes32 key
    ) external payable nonReentrant escrowExists(key) {
        Escrow storage e = escrows[key];

        require(msg.sender == e.agent, "only agent");
        require(e.state == EscrowState.Created, "invalid state");

        if (e.asset == address(0)) {
            require(msg.value == e.amount, "wrong eth");
        } else {
            require(msg.value == 0, "no eth allowed");
            bool ok = IERC20Minimal(e.asset).transferFrom(
                msg.sender,
                address(this),
                e.amount
            );
            require(ok, "token transfer failed");
        }

        e.fundedAt = block.timestamp;
        e.expiry = block.timestamp + e.holdDuration;
        e.state = EscrowState.Funded;

        lockedForMerchant[e.merchant] += e.amount;
        lockedForResource[key] += e.amount;
    }

    // ---------------------------------------------------------
    // Agent Actions
    // ---------------------------------------------------------

    function requestSettlement(bytes32 key) external escrowExists(key) {
        Escrow storage e = escrows[key];
        require(msg.sender == e.agent, "only agent");
        require(e.state == EscrowState.Funded, "not funded");

        e.agentRequestedSettlement = true;
        e.state = EscrowState.SettlementRequested;

        emit SettlementRequested(key, msg.sender);
    }

    function raiseDispute(bytes32 key) external escrowExists(key) {
        Escrow storage e = escrows[key];
        require(msg.sender == e.agent, "only agent");
        require(
            e.state == EscrowState.Funded ||
                e.state == EscrowState.SettlementRequested,
            "invalid state"
        );

        e.agentRaisedDispute = true;
        e.state = EscrowState.Disputed;
    }

    // ---------------------------------------------------------
    // Facilitator Settlement
    // ---------------------------------------------------------

    function finalizeSettlement(
        bytes32 key,
        bool payMerchant
    ) external nonReentrant onlyFacilitator escrowExists(key) {
        Escrow storage e = escrows[key];
        require(
            e.state == EscrowState.Funded ||
                e.state == EscrowState.SettlementRequested ||
                e.state == EscrowState.Disputed,
            "invalid state"
        );

        address payable recipient = payable(payMerchant ? e.merchant : e.agent);

        _transferOut(e.asset, recipient, e.amount);

        lockedForMerchant[e.merchant] -= e.amount;
        lockedForResource[key] -= e.amount;

        e.state = EscrowState.Settled;

        emit SettlementFinalized(key, e.merchant, payMerchant);
    }

    // ---------------------------------------------------------
    // Get Escrow (public getter)
    // ---------------------------------------------------------

    function getEscrow(bytes32 key) external view escrowExists(key) returns (Escrow memory) {
        return escrows[key];
    }

    // ---------------------------------------------------------
    // Auto Release After Expiry
    // ---------------------------------------------------------

    function claimAfterExpiry(
        bytes32 key
    ) external nonReentrant escrowExists(key) {
        Escrow storage e = escrows[key];
        require(
            e.state == EscrowState.Funded ||
                e.state == EscrowState.SettlementRequested,
            "not eligible"
        );
        require(block.timestamp > e.expiry, "not expired");

        _transferOut(e.asset, payable(e.merchant), e.amount);

        lockedForMerchant[e.merchant] -= e.amount;
        lockedForResource[key] -= e.amount;

        e.state = EscrowState.Released;
    }

    // ---------------------------------------------------------
    // Internal Transfer
    // ---------------------------------------------------------

    function _transferOut(
        address asset,
        address payable to,
        uint256 amount
    ) internal {
        if (asset == address(0)) {
            (bool ok, ) = to.call{value: amount}("");
            require(ok, "eth transfer failed");
        } else {
            bool ok = IERC20Minimal(asset).transfer(to, amount);
            require(ok, "token transfer failed");
        }
    }

    receive() external payable {
        revert("use deposit()");
    }
}
