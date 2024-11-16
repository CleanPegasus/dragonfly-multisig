# Dragonfly-Multisig Wallet

A zero-knowledge multi-signature wallet that preserves owner privacy while maintaining the security guarantees of traditional multisig wallets. The wallet uses zk-SNARKs (Groth16) to prove ownership without revealing the actual owners' addresses.

## Overview

This implementation combines:
- Zero-knowledge proofs for owner privacy
- Multi-signature functionality for enhanced security
- On-chain transaction management
- Replay attack prevention through attestations

### Key Features

- **Privacy**: Owner addresses are never revealed on-chain
- **Security**: Requires M-of-N signatures to execute transactions
- **Flexibility**: Supports arbitrary ETH transfers and contract interactions
- **Replay Protection**: Uses unique attestations for each signature

## Technical Architecture

### Smart Contracts

1. **MultiSigWallet.sol**
   - Manages transaction lifecycle
   - Stores hashed owner identities
   - Verifies zk-proofs for ownership
   - Handles transaction execution

2. **Groth16Verifier.sol**
   - Verifies zero-knowledge proofs
   - Integrated with the main wallet contract

### Circuits

The zero-knowledge circuit (`multisig.circom`) proves:
- Ownership: The prover knows a private key corresponding to one of the registered owner hashes
- Message Attestation: The prover has signed the transaction data

## Setup and Deployment

### Prerequisites

```bash
npm install hardhat ethers snarkjs circomlib
```

### Compilation and Setup

1. **Compile Circuits**
```bash
# Compile the circuit
circom multisig.circom --r1cs --wasm --sym

# Generate and contribute to the trusted setup
snarkjs powersoftau new bn128 12 pot12_0000.ptau -v
snarkjs powersoftau contribute pot12_0000.ptau pot12_0001.ptau --name="First contribution" -v

# Generate the final zkey
snarkjs groth16 setup multisig.r1cs pot12_0001.ptau multisig_0000.zkey
snarkjs zkey contribute multisig_0000.zkey multisig_0001.zkey --name="1st Contributor" -v
```

2. **Deploy Contracts**
```bash
npx hardhat run scripts/deploy.js --network <your-network>
```

## Usage

### Creating a Transaction

1. Generate a proof of ownership:
```javascript
const proof = await createProof(
    ownerPrivateKey,    // Private key chunks
    messageHash,        // Transaction data hash
    ownerHash1,         // Registered owner hashes
    ownerHash2,
    ownerHash3
);
```

2. Submit the transaction:
```javascript
await multisig.submitTransaction(
    to,                 // Destination address
    value,             // ETH amount
    data,              // Transaction data
    proof.a,           // Proof components
    proof.b,
    proof.c,
    proof.publicSignals
);
```

### Confirming a Transaction

```javascript
await multisig.confirmTransaction(
    txIndex,           // Transaction index
    proof.a,           // New proof components
    proof.b,
    proof.c,
    proof.publicSignals
);
```

### Executing a Transaction

Once enough confirmations are collected:
```javascript
await multisig.executeTransaction(txIndex);
```

## Security Considerations

1. **Private Key Management**
   - Never share private keys
   - Use secure key generation and storage

2. **Proof Generation**
   - Generate proofs locally
   - Verify proofs before submission

3. **Smart Contract Security**
   - Contract is non-upgradeable
   - Uses replay protection for signatures
   - Implements proper access controls

## Testing

Run the test suite:
```bash
npx hardhat test
```

The test suite includes:
- Contract deployment
- Transaction submission
- Confirmation flow
- Execution verification
- Invalid proof rejection

## Development

### Local Setup

1. Clone the repository:
```bash
git clone https://github.com/CleanPegasus/dragonfly-multisig
cd dragonfly-multisig
```

2. Install dependencies:
```bash
npm install
```

3. Run local node:
```bash
npx hardhat node
```

4. Deploy contracts:
```bash
npx hardhat run scripts/deploy.js --network localhost
```
