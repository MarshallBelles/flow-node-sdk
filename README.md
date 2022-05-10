# flow-ts
Flow SDK for Node with TypeScript bindings

This package is intended for use within Node. Browser implementations may work somewhat but are unsupported.

## Overview 

This reference documents all the methods available in the SDK, and explains in detail how these methods work.
SDKs are open source, and you can use them according to either the MIT / APACHE2.0 license at your preference.


## Getting Started

### Installing

```bash
npm install --save flow-node-sdk;
```


### Importing the Library

To import and build the library, run `cargo test` or `cargo build` inside your project directory.

## Connect

The library uses gRPC to communicate with the access nodes and it must be configured with an access node API URL. 

� **Access API URLs** can be found [here](https://docs.onflow.org/access-api/#flow-access-node-endpoints). An error will be returned if the host is unreachable.
The Access Nodes hosted by DapperLabs are accessible at:
- Testnet `access.devnet.nodes.onflow.org:9000`
- Mainnet `access.mainnet.nodes.onflow.org:9000`
- Local Emulator `127.0.0.1:3569` 

```ts
use flow_rust_sdk::*;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut connection = FlowConnection::new("grpc://localhost:3569").await?;
    Ok(())
}
```

## Querying the Flow Network
After you have established a connection with an access node, you can query the Flow network to retrieve data about blocks, accounts, events and transactions. We will explore how to retrieve each of these entities in the sections below.

### Get Blocks

Query the network for block by id, height or get the latest block.

� **Block ID** is the SHA3-256 hash of the entire block payload. This hash is stored as an ID field on any block response object (ie. response from `GetLatestBlock`). 

� **Block height** expresses the height of the block on the chain. The latest block height is increased by one for every valid block produced.

#### Examples

This example depicts ways to get the latest block as well as any other block by height or ID:

```ts
use flow_rust_sdk::*;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut connection = FlowConnection::new("grpc://localhost:3569").await?;

    let get_latest_block_response = connection.get_block(None, None, None).await?;

    println!("{:?}", get_latest_block_response);
    Ok(())
}
```
Result output:
```bash

```

### Get Account

Retrieve any account from Flow network's latest block or from a specified block height.

� **Account address** is a unique account identifier. Be mindful about the `0x` prefix, you should use the prefix as a default representation but be careful and safely handle user inputs without the prefix.

An account includes the following data:
- Address: the account address.
- Balance: balance of the account.
- Contracts: list of contracts deployed to the account.
- Keys: list of keys associated with the account.

#### Examples
Example depicts ways to get an account at the latest block and at a specific block height:

```ts
use flow_rust_sdk::*;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut connection = FlowConnection::new("grpc://localhost:3569").await?;

    // make sure you sanitize your inputs and remove the 0x before trying to get_account
    let get_account_response = connection.get_account("f8d6e0586b0a20c7").await?;

    println!("{:?}", get_account_response);
    Ok(())
}
```
Result output:
```bash

```


### Get Transactions

Retrieve transactions from the network by providing a transaction ID. After a transaction has been submitted, you can also get the transaction result to check the status.

� **Transaction ID** is a hash of the encoded transaction payload and can be calculated before submitting the transaction to the network.

⚠️ The transaction ID provided must be from the current spork.

� **Transaction status** represents the state of transaction in the blockchain. Status can change until is finalized.

| Status    | Final | Description                                                              |
| --------- | ----- | ------------------------------------------------------------------------ |
| UNKNOWN   | ❌     | The transaction has not yet been seen by the network                     |
| PENDING   | ❌     | The transaction has not yet been included in a block                     |
| FINALIZED | ❌     | The transaction has been included in a block                             |
| EXECUTED  | ❌     | The transaction has been executed but the result has not yet been sealed |
| SEALED    | ✅     | The transaction has been executed and the result is sealed in a block    |
| EXPIRED   | ✅     | The transaction reference block is outdated before being executed        |


```ts
use flow_rust_sdk::*;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut connection = FlowConnection::new("grpc://localhost:3569").await?;

    let get_account_response = connection.get_transaction_result(hex::decode("1c1b1e76b591f78d27a2dc5f78bb8dbebccca587c068925924b36334ae1c2b4a")?).await?;

    println!("{:?}", get_account_response);
    Ok(())
}
```

Example output:

```bash

```


### Get Events

Retrieve events by a given type in a specified block height range or through a list of block IDs.

� **Event type** is a string that follow a standard format:
```
A.{contract address}.{contract name}.{event name}
```

Please read more about [events in the documentation](https://docs.onflow.org/core-contracts/flow-token/). The exception to this standard are 
core events, and you should read more about them in [this document](https://docs.onflow.org/cadence/language/core-events/).

� **Block height range** expresses the height of the start and end block in the chain.

#### Examples
Example depicts ways to get events within block range or by block IDs:

```ts
use flow_rust_sdk::*;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut connection = FlowConnection::new("grpc://localhost:3569").await?;

    let current_block = connection.get_block(None, None, None).await?.block.unwrap();
    let get_event_response = connection.get_events_for_block_ids("A.f8d6e0586b0a20c7.FlowToken.TokensDeposited", vec![current_block.id]).await?;

    println!("{:?}", get_event_response);
    Ok(())
}
```
Example output:
```bash

```

### Get Collections

Retrieve a batch of transactions that have been included in the same block, known as ***collections***. 
Collections are used to improve consensus throughput by increasing the number of transactions per block and they act as a link between a block and a transaction.

� **Collection ID** is SHA3-256 hash of the collection payload.

Example retrieving a collection:
```ts
use flow_rust_sdk::*;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut connection = FlowConnection::new("grpc://localhost:3569").await?;

    let get_event_response = connection.get_collection(hex::decode("COLLECTION_HEX_ENCODED_ID")?).await?;

    println!("{:?}", get_event_response);
    Ok(())
}

```

### Execute Scripts

Scripts allow you to write arbitrary non-mutating Cadence code on the Flow blockchain and return data. You can learn more about [Cadence and scripts here](https://docs.onflow.org/cadence/language/).

We can execute a script using the latest state of the Flow blockchain or we can choose to execute the script at a specific time in history defined by a block height or block ID.

� **Block ID** is SHA3-256 hash of the entire block payload, but you can get that value from the block response properties.

� **Block height** expresses the height of the block in the chain.

```ts
use flow_rust_sdk::*;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut connection = FlowConnection::new("grpc://localhost:3569").await?;

    // Simple script with one argument
    let script = b"
        pub fun main(a: Int64): Int64 {
            return a + 10
        }
    ";

    let arg1 = Argument::int64(5).encode();
    let script_execution_result = connection.execute_script(script.to_vec(), vec![arg1], None, None).await?;

    println!("{:?}", from_slice::<Value>(&script_execution_result.value)?);
    Ok(())
}
```

Example output:
```bash

```

More complex example:
```ts
use flow_rust_sdk::*;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut connection = FlowConnection::new("grpc://localhost:3569").await?;

    // complex script
    let script = b"
    pub struct User {
            pub var balance: UFix64
            pub var address: Address
            pub var name: String

            init(name: String, address: Address, balance: UFix64) {
                self.name = name
                self.address = address
                self.balance = balance
            }
        }

        pub fun main(name: String): User {
            return User(
                name: name,
                address: 0x1,
                balance: 10.0
            )
        }
    ";

    let arg1 = Argument::str("my name").encode_str();
    let script_execution_result = connection
        .execute_script(script.to_vec(), vec![arg1], None, None)
        .await?;

    println!("{:?}", from_slice::<Value>(&script_execution_result.value)?);
    Ok(())
}
```

Example output:
```bash
```

## Mutate Flow Network
Flow, like most blockchains, allows anybody to submit a transaction that mutates the shared global chain state. A transaction is an object that holds a payload, which describes the state mutation, and one or more authorizations that permit the transaction to mutate the state owned by specific accounts.

Transaction data is composed and signed with help of the SDK. The signed payload of transaction then gets submitted to the access node API. If a transaction is invalid or the correct number of authorizing signatures are not provided, it gets rejected. 

Executing a transaction requires couple of steps:
- [Building a transaction](#build-transactions).
- [Signing a transaction](#sign-transactions).
- [Sending a transaction](#send-transactions).

## Transactions
A transaction is nothing more than a signed set of data that includes script code which are instructions on how to mutate the network state and properties that define and limit it's execution. All these properties are explained bellow. 

� **Script** field is the portion of the transaction that describes the state mutation logic. On Flow, transaction logic is written in [Cadence](https://docs.onflow.org/cadence/). Here is an example transaction script:
```
transaction(greeting: String) {
  execute {
    log(greeting.concat(", World!"))
  }
}
```

� **Arguments**. A transaction can accept zero or more arguments that are passed into the Cadence script. The arguments on the transaction must match the number and order declared in the Cadence script. Sample script from above accepts a single `String` argument.

� **[Proposal key](https://docs.onflow.org/concepts/transaction-signing/#proposal-key)** must be provided to act as a sequence number and prevent reply and other potential attacks.

Each account key maintains a separate transaction sequence counter; the key that lends its sequence number to a transaction is called the proposal key.

A proposal key contains three fields:
- Account address
- Key index
- Sequence number

A transaction is only valid if its declared sequence number matches the current on-chain sequence number for that key. The sequence number increments by one after the transaction is executed.

� **[Payer](https://docs.onflow.org/concepts/transaction-signing/#signer-roles)** is the account that pays the fees for the transaction. A transaction must specify exactly one payer. The payer is only responsible for paying the network and gas fees; the transaction is not authorized to access resources or code stored in the payer account.

� **[Authorizers](https://docs.onflow.org/concepts/transaction-signing/#signer-roles)** are accounts that authorize a transaction to read and mutate their resources. A transaction can specify zero or more authorizers, depending on how many accounts the transaction needs to access.

The number of authorizers on the transaction must match the number of AuthAccount parameters declared in the prepare statement of the Cadence script.

Example transaction with multiple authorizers:
```
transaction {
  prepare(authorizer1: AuthAccount, authorizer2: AuthAccount) { }
}
```

� **Gas limit** is the limit on the amount of computation a transaction requires, and it will abort if it exceeds its gas limit.
Cadence uses metering to measure the number of operations per transaction. You can read more about it in the [Cadence documentation](/cadence).

The gas limit depends on the complexity of the transaction script. Until dedicated gas estimation tooling exists, it's best to use the emulator to test complex transactions and determine a safe limit.

� **Reference block** specifies an expiration window (measured in blocks) during which a transaction is considered valid by the network.
A transaction will be rejected if it is submitted past its expiry block. Flow calculates transaction expiry using the _reference block_ field on a transaction.
A transaction expires after `600` blocks are committed on top of the reference block, which takes about 10 minutes at average Mainnet block rates.

### Build Transactions

Building a transaction involves setting the required properties explained above and producing a transaction object.

Here we define a simple transaction script that will be used to execute on the network and serve as a good learning example.

```
transaction(greeting: String) {

  let guest: Address

  prepare(authorizer: AuthAccount) {
    self.guest = authorizer.address
  }

  execute {
    log(greeting.concat(",").concat(guest.toString()))
  }
}
```

```ts
    // we need to know who is paying for the transaction, along with their signing key
    let payer = "f8d6e0586b0a20c7";
    let payer_private_key = "324db577a741a9b7a2eb6cef4e37e72ff01a554bdbe4bd77ef9afe1cb00d3cec";
    let payer_private_key_id = 0;
    let account: flow::Account = connection.get_account(payer).await?.account.unwrap();
    let proposer = flow::TransactionProposalKey {
        address: hex::decode(payer).unwrap(),
        key_id: payer_private_key_id,
        sequence_number: account.keys[payer_private_key_id as usize].sequence_number as u64,
    };

    let transaction = b"
    transaction(greeting: String) {

        let guest: Address
      
        prepare(authorizer: AuthAccount) {
          self.guest = authorizer.address
        }
      
        execute {
          log(greeting.concat(\",\").concat(guest.toString()))
        }
      }
    ";

    let latest_block = connection.get_block(None, None, None).await?.block.unwrap();
    let arg1 = Argument::str("hello world!").encode_str();
    let built_transaction = build_transaction(transaction.to_vec(), vec![arg1], latest_block.id, 9999, proposer, vec![payer.to_owned()], payer.to_owned()).await?;
```

### Sign Transactions

Flow introduces new concepts that allow for more flexibility when creating and signing transactions.
Before trying the examples below, we recommend that you read through the [transaction signature documentation](https://docs.onflow.org/concepts/accounts-and-keys/).

After you have successfully [built a transaction](#build-transactions) the next step in the process is to sign it. Flow transactions have envelope and payload signatures, and you should learn about them in the [signature documentation](https://docs.onflow.org/concepts/accounts-and-keys/#anatomy-of-a-transaction).


Signatures can be generated more securely using keys stored in a hardware device such as an [HSM](https://en.wikipedia.org/wiki/Hardware_security_module). The `crypto.Signer` interface is intended to be flexible enough to support a variety of signer implementations and is not limited to in-memory implementations.

Simple signature example:
```ts
    let signature = Sign {
        address: payer.to_owned(),
        key_id: payer_private_key_id,
        private_key: payer_private_key.to_owned(),
    };
    // here we place the signature within the Vector that is passed for the envelope signatures.
    let signed_transaction = sign_transaction(built_transaction, vec![], vec![&signature]).await?;
```

Flow supports great flexibility when it comes to transaction signing. We can define multiple authorizers (multi-sig transactions) and even choose who will pay for the transaction. We will explore advanced signing scenarios bellow.

### [Single party, single signature](https://docs.onflow.org/concepts/transaction-signing/#single-party-single-signature)

- Proposer, payer and authorizer are the same account (`0x01`).
- Only the envelope must be signed.
- Proposal key must have full signing weight.

| Account | Key ID | Weight |
| ------- | ------ | ------ |
| `0x01`  | 1      | 1.0    |

```ts
    let signature = Sign {
        address: "01".to_owned(), // don't pass in the 0x prefix
        key_id: 1,
        private_key: "324db577a741a9b7a2eb6cef4e37e72ff01a554bdbe4bd77ef9afe1cb00d3cec".to_owned(),
    };
    // here we place the signature within the Vector that is passed for the envelope signatures.
    let signed_transaction = sign_transaction(built_transaction, vec![], vec![&signature]).await?;
```


### [Single party, multiple signatures](https://docs.onflow.org/concepts/transaction-signing/#single-party-multiple-signatures)

- Proposer, payer and authorizer are the same account (`0x01`).
- Only the envelope must be signed.
- Each key has weight 0.5, so two signatures are required.

| Account | Key ID | Weight |
| ------- | ------ | ------ |
| `0x01`  | 1      | 0.5    |
| `0x01`  | 2      | 0.5    |

```ts
    let signature1 = Sign {
        address: "01".to_owned(),
        key_id: 1,
        private_key: "324db577a741a9b7a2eb6cef4e37e72ff01a554bdbe4bd77ef9afe1cb00d3cec".to_owned(),
    };
    let signature2 = Sign {
        address: "01".to_owned(),
        key_id: 2,
        private_key: "e408a21f73615f2a312c936818c50ff2225c16d772dbe0bd2b867ae40d9b5f0f".to_owned(),
    };
    // here we place both signatures within the Vector that is passed for the envelope signatures.
    let signed_transaction = sign_transaction(built_transaction, vec![], vec![&signature1, &signature2]).await?;
```

### [Multiple parties](https://docs.onflow.org/concepts/transaction-signing/#multiple-parties)

- Proposer and authorizer are the same account (`0x01`).
- Payer is a separate account (`0x02`).
- Account `0x01` signs the payload.
- Account `0x02` signs the envelope.
    - Account `0x02` must sign last since it is the payer.

| Account | Key ID | Weight |
| ------- | ------ | ------ |
| `0x01`  | 1      | 1.0    |
| `0x02`  | 3      | 1.0    |

```ts
    let signature1 = Sign {
        address: "01".to_owned(),
        key_id: 1,
        private_key: "324db577a741a9b7a2eb6cef4e37e72ff01a554bdbe4bd77ef9afe1cb00d3cec".to_owned(),
    };
    let signature2 = Sign {
        address: "02".to_owned(),
        key_id: 3,
        private_key: "d48276bee1a95dd0e217dc22ac1338a694bfc5543fb202c1d8deecffd0f86282".to_owned(),
    };
    // here we place both signatures within the Vector that is passed for the envelope signatures.
    let signed_transaction = sign_transaction(built_transaction, vec![], vec![&signature1, &signature2]).await?;

```

### [Multiple parties, two authorizers](https://docs.onflow.org/concepts/transaction-signing/#multiple-parties)

- Proposer and authorizer are the same account (`0x01`).
- Payer is a separate account (`0x02`).
- Account `0x01` signs the payload.
- Account `0x02` signs the envelope.
    - Account `0x02` must sign last since it is the payer.
- Account `0x02` is also an authorizer to show how to include two AuthAccounts into an transaction

| Account | Key ID | Weight |
| ------- | ------ | ------ |
| `0x01`  | 1      | 1.0    |
| `0x02`  | 3      | 1.0    |

```ts
// In this more complicated example, we will need to specify both keys as authorizers when building the transaction
let built_transaction = build_transaction(transaction.to_vec(), vec![], latest_block.id, 9999, proposer, vec!["01".to_owned(), "02".to_owned()], payer.to_owned()).await?;

// then the signing part is actually simple
    let signature1 = Sign {
        address: "01".to_owned(),
        key_id: 1,
        private_key: "324db577a741a9b7a2eb6cef4e37e72ff01a554bdbe4bd77ef9afe1cb00d3cec".to_owned(),
    };
    let signature2 = Sign {
        address: "02".to_owned(),
        key_id: 3,
        private_key: "d48276bee1a95dd0e217dc22ac1338a694bfc5543fb202c1d8deecffd0f86282".to_owned(),
    };
    let signed_transaction = sign_transaction(built_transaction, vec![&signature1], vec![&signature2]).await?;

```

### [Multiple parties, multiple signatures](https://docs.onflow.org/concepts/transaction-signing/#multiple-parties)

- Proposer and authorizer are the same account (`0x01`).
- Payer is a separate account (`0x02`).
- Account `0x01` signs the payload.
- Account `0x02` signs the envelope.
    - Account `0x02` must sign last since it is the payer.
- Both accounts must sign twice (once with each of their keys).

| Account | Key ID | Weight |
| ------- | ------ | ------ |
| `0x01`  | 1      | 0.5    |
| `0x01`  | 2      | 0.5    |
| `0x02`  | 3      | 0.5    |
| `0x02`  | 4      | 0.5    |

```ts
    let key1sig = Sign {
        address: "01".to_owned(),
        key_id: 1,
        private_key: "324db577a741a9b7a2eb6cef4e37e72ff01a554bdbe4bd77ef9afe1cb00d3cec".to_owned(),
    };
    let key2sig = Sign {
        address: "01".to_owned(),
        key_id: 2,
        private_key: "e408a21f73615f2a312c936818c50ff2225c16d772dbe0bd2b867ae40d9b5f0f".to_owned(),
    };
    let key3sig = Sign {
        address: "02".to_owned(),
        key_id: 3,
        private_key: "d48276bee1a95dd0e217dc22ac1338a694bfc5543fb202c1d8deecffd0f86282".to_owned(),
    };
    let key4sig = Sign {
        address: "02".to_owned(),
        key_id: 4,
        private_key: "38eb2ded396c557affdcca9596bcf7e8643dcc433157acdee93357c7be7693ae".to_owned(),
    };

    let signed_transaction = sign_transaction(built_transaction, vec![&key1sig, &key2sig], vec![&key3sig, &key4sig]).await?;
```

### Send Transactions

After a transaction has been [built](#build-transactions) and [signed](#sign-transactions), it can be sent to the Flow blockchain where it will be executed. If sending was successful you can then [retrieve the transaction result](#get-transactions).


```ts
    let transaction_response = connection.send_transaction(signed_transaction).await?;
```


### Create Accounts

On Flow, account creation happens inside a transaction. Because the network allows for a many-to-many relationship between public keys and accounts, it's not possible to derive a new account address from a public key offline. 

The Flow VM uses a deterministic address generation algorithm to assigen account addresses on chain. You can find more details about address generation in the [accounts & keys documentation](https://docs.onflow.org/concepts/accounts-and-keys/).

#### Public Key
Flow uses ECDSA key pairs to control access to user accounts. Each key pair can be used in combination with the SHA2-256 or SHA3-256 hashing algorithms.

⚠️ You'll need to authorize at least one public key to control your new account.

⚠️ The Flow-Node-SDK ONLY supports the SHA3-256 hashing algorithm.

Flow represents ECDSA public keys in raw form without additional metadata. Each key is a single byte slice containing a concatenation of its X and Y components in big-endian byte form.

A Flow account can contain zero (not possible to control) or more public keys, referred to as account keys. Read more about [accounts in the documentation](https://docs.onflow.org/concepts/accounts-and-keys/#accounts).

An account key contains the following data:
- Raw public key (described above)
- Signature algorithm
- Hash algorithm
- Weight (integer between 0-1000)

Account creation happens inside a transaction, which means that somebody must pay to submit that transaction to the network. We'll call this person the account creator. Make sure you have read [sending a transaction section](#send-transactions) first. 

```ts
    let result = connection.create_account(public_keys, payer, payer_private_key, payer_private_key_id).await?;
```

After the account creation transaction has been submitted you can retrieve the new account address by [getting the transaction result](#get-transactions). 

The new account address will be emitted in a system-level `flow.AccountCreated` event.


### Generate Keys
Flow uses [ECDSA](https://en.wikipedia.org/wiki/Elliptic_Curve_Digital_Signature_Algorithm) signatures to control access to user accounts. Each key pair can be used in combination with the `SHA2-256` or `SHA3-256` hashing algorithms.

Here's how to generate an ECDSA private key for the P-256 (secp256r1) curve.

```ts
    // TODO: Not implemented at this time. :)
```

The example above uses an ECDSA key pair on the P-256 (secp256r1) elliptic curve. Flow also supports the secp256k1 curve used by Bitcoin and Ethereum. Read more about [supported algorithms here](https://docs.onflow.org/concepts/accounts-and-keys/#supported-signature--hash-algorithms).
