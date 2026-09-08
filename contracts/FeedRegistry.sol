// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

// Adapted from POP's dual-signature registry pattern. Original notice retained
// in licenses/ProofOfPatience-MIT.txt. This V0 contract is not deployed or audited.
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Ownable2Step} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";

/// @notice Records verifier-approved local-rule results. No shared-world logic yet.
/// @dev A signature and trace hash do not prove a run was played honestly.
///      Production requires a replay verifier and a defined snapshot policy.
contract FeedRegistry is EIP712, Ownable2Step, Pausable {
    struct RunResult {
        bytes32 runId;
        bytes32 gameVersion;
        address player;
        uint64 score;
        uint32 durationTicks;
        uint32 totalFeeds;
        uint32 correctFeeds;
        uint32 mutationEvents;
        bytes32 seed;
        bytes32 traceHash;
        bytes32 snapshotHash;
        uint64 deadline;
    }
    bytes32 private constant RESULT_TYPEHASH = keccak256("RunResult(bytes32 runId,bytes32 gameVersion,address player,uint64 score,uint32 durationTicks,uint32 totalFeeds,uint32 correctFeeds,uint32 mutationEvents,bytes32 seed,bytes32 traceHash,bytes32 snapshotHash,uint64 deadline)");
    bytes32 private constant ATTESTATION_TYPEHASH = keccak256("VerifierAttestation(bytes32 resultHash)");
    uint32 public constant MAX_DURATION_TICKS = 7200;
    uint32 public constant FEED_COOLDOWN_TICKS = 15;
    uint64 public constant SIGNATURE_WINDOW = 15 minutes;
    address public verifier;
    bytes32 public activeGameVersion;
    mapping(bytes32 => bool) public usedRunIds;
    mapping(address => uint64) public bestScore;
    event ResultRecorded(bytes32 indexed runId, address indexed player, bytes32 indexed gameVersion, uint64 score, bytes32 snapshotHash, bytes32 traceHash);
    event VerifierChanged(address indexed previousVerifier, address indexed nextVerifier);
    error InvalidResult();
    error InvalidSignature();
    error DuplicateRun();

    constructor(address initialOwner, address initialVerifier, bytes32 gameVersion)
        EIP712("Do Not Feed It", "0") Ownable(initialOwner)
    {
        if (initialVerifier == address(0) || gameVersion == bytes32(0)) revert InvalidResult();
        verifier = initialVerifier;
        activeGameVersion = gameVersion;
    }

    /// @dev Any relayer can submit; the signatures bind the player and every field.
    function submitResult(RunResult calldata result, bytes calldata playerSignature, bytes calldata verifierSignature) external whenNotPaused {
        if (usedRunIds[result.runId]) revert DuplicateRun();
        if (
            result.player == address(0) || result.runId == bytes32(0) ||
            result.gameVersion != activeGameVersion || result.durationTicks > MAX_DURATION_TICKS ||
            result.deadline < block.timestamp || result.deadline > block.timestamp + SIGNATURE_WINDOW ||
            result.totalFeeds > result.durationTicks / FEED_COOLDOWN_TICKS + 1 ||
            result.correctFeeds > result.totalFeeds || result.mutationEvents > result.correctFeeds / 3 ||
            result.score > uint256(result.correctFeeds) * 500
        ) revert InvalidResult();
        bytes32 digest = _hashTypedDataV4(keccak256(abi.encode(RESULT_TYPEHASH, result)));
        if (ECDSA.recover(digest, playerSignature) != result.player) revert InvalidSignature();
        bytes32 attestation = _hashTypedDataV4(keccak256(abi.encode(ATTESTATION_TYPEHASH, digest)));
        if (ECDSA.recover(attestation, verifierSignature) != verifier) revert InvalidSignature();
        usedRunIds[result.runId] = true;
        if (result.score > bestScore[result.player]) bestScore[result.player] = result.score;
        emit ResultRecorded(result.runId, result.player, result.gameVersion, result.score, result.snapshotHash, result.traceHash);
    }
    function pause() external onlyOwner { _pause(); }
    function unpause() external onlyOwner { _unpause(); }
    function setVerifier(address nextVerifier) external onlyOwner {
        if (nextVerifier == address(0)) revert InvalidResult();
        emit VerifierChanged(verifier, nextVerifier);
        verifier = nextVerifier;
    }
}
