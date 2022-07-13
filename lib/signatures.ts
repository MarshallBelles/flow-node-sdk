/* eslint-disable no-unused-vars */
import { addressBuffer, blockBuffer, rlpEncode, scriptBuffer, signatureBuffer } from './encode';
import { ec as EC } from 'elliptic';
import { SHA3 } from 'sha3';

export interface TransactionResultResponse {
  id: Buffer;
  status: string;
  status_code: number;
  error_message: string;
  events: Array<Event>;
}

export interface TransactionQueuedResponse {
  id: Buffer;
}

export interface Event {
  type: string;
  transaction_id: Buffer;
  transaction_index: number;
  event_index: number;
  payload: Buffer;
}

export interface Account {
  address: Buffer;
  balance: number;
  code: Buffer;
  keys: Array<AccountKey>;
  contracts: Object;
}

export interface Block {
  id: Buffer;
  parent_id: Buffer;
  height: number;
  timestamp: Timestamp;
  collection_guarantees: Array<CollectionGuarantee>;
  block_seals: Array<BlockSeal>;
  signatures: Array<Buffer>;
}

export interface Timestamp {
  seconds: number;
  nanos: number;
}

export interface CollectionGuarantee {
  collection_id: Buffer;
  signatures: Array<Buffer>;
}

export interface BlockSeal {
  block_id: Buffer;
  execution_receipt_id: Buffer;
  execution_receipt_signatures: Array<Buffer>;
  result_approval_signatures: Array<Buffer>;
}

export interface AccountKey {
  address: string;
  id: number;
  public_key: Buffer;
  private_key?: Buffer;
  sign_algo: number;
  hash_algo: number;
  weight: number;
  sequence_number: number;
  revoked: Boolean;
}

export interface Transaction {
  script: Buffer;
  arguments: Array<Buffer>;
  reference_block_id: Buffer;
  gas_limit: number;
  proposal_key: {
      address: Buffer;
      key_id: number;
      sequence_number: number;
  };
  payer: Buffer;
  authorizers: Array<Buffer>;
  payload_signatures: Array<TransactionSignature>;
  envelope_signatures: Array<TransactionSignature>;
}

export interface TransactionSignature {
  address: Buffer;
  key_id: number;
  signature: Buffer;
}

export enum TransactionStatus {
  UNKNOWN,
  PENDING,
  FINALIZED,
  EXECUTED,
  SEALED,
  EXPIRED
}

export interface Signature {
  address: string;
  keyId: number;
  sig: string;
  signerIndex?: number;
}


export interface TxPayload {
  script: string;
  arguments: Buffer[];
  refBlock: string;
  gasLimit: number;
  proposalKey: {
      address: Buffer;
      key_id: number;
      sequence_number: number;
  };
  payer: string;
  authorizers: string[];
}

export interface TxEnvelope {
  script: string;
  arguments: Buffer[];
  refBlock: string;
  gasLimit: number;
  proposalKey: {
      address: Buffer;
      key_id: number;
      sequence_number: number;
  };
  payer: string;
  authorizers: string[];
  payload_signatures: Signature[]
}

export const encodeTransactionPayload = (tx: TxPayload): string => rlpEncode(preparePayload(tx));

export const encodeTransactionEnvelope = (tx: TxEnvelope): string => rlpEncode(prepareEnvelope(tx));

const rightPaddedHexBuffer = (value: string, pad: number): Buffer => Buffer.from(value.padEnd(pad * 2, '0'), 'hex');

export const signTransaction = (transaction: Transaction, payloadSignatures: AccountKey[], envelopeSignatures: AccountKey[]): Transaction => {
  const tr = transaction;
  const payloadSigs: Signature[] = [];
  payloadSignatures.forEach((ps) => {
    const payloadMsg = encodeTransactionPayload({
      script: tr.script.toString('utf-8'),
      arguments: tr.arguments,
      refBlock: tr.reference_block_id.toString('hex'),
      gasLimit: tr.gas_limit,
      proposalKey: {
        address: tr.proposal_key.address,
        key_id: tr.proposal_key.key_id,
        sequence_number: tr.proposal_key.sequence_number,
      },
      payer: tr.payer.toString('hex'),
      authorizers: tr.authorizers.map((x) => x.toString('hex')),
    });
    const thisSig = transactionSignature(payloadMsg, ps);
    tr.payload_signatures.push({ address: Buffer.from(<string>ps.address, 'hex'), key_id: <number>ps.id, signature: Buffer.from(thisSig, 'hex') });
    payloadSigs.push({ address: <string>ps.address, keyId: <number>ps.id, sig: thisSig });
  });
  envelopeSignatures.forEach((es) => {
    const envelopeMsg = encodeTransactionEnvelope({
      script: tr.script.toString('utf-8'),
      arguments: tr.arguments,
      refBlock: tr.reference_block_id.toString('hex'),
      gasLimit: tr.gas_limit,
      proposalKey: {
        address: tr.proposal_key.address,
        key_id: tr.proposal_key.key_id,
        sequence_number: tr.proposal_key.sequence_number,
      },
      payer: tr.payer.toString('hex'),
      payload_signatures: payloadSigs,
      authorizers: tr.authorizers.map((x) => x.toString('hex')),
    });
    const thisSig = transactionSignature(envelopeMsg, es);
    tr.envelope_signatures.push({ address: Buffer.from(<string>es.address, 'hex'), key_id: <number>es.id, signature: Buffer.from(thisSig, 'hex') });
  });
  return tr;
};

export const argParse = (arg: any): Object => {
  switch (typeof arg) {
    case 'string':
      // handle string
      return {
        type: 'String',
        value: arg,
      };
    case 'boolean':
      // handle boolean
      return {
        type: 'Bool',
        value: arg,
      };
    case 'bigint':
      // handle bigint
      return {
        type: 'Int64',
        value: arg.toString(),
      };
    case 'number':
      // handle number
      if (Number.isInteger(arg)) {
        return {
          type: 'Int',
          value: arg.toString(),
        };
      } else {
        return {
          type: 'Fix64',
          value: arg.toString(),
        };
      }

    default:
      // argument is not supported, convert to string
      return {
        type: 'String',
        value: arg.toString(),
      };
  }
};

export const argBuilder = (args: any[]): string[] => {
  const bufs: Array<Buffer> = [];
  args.forEach((a) => {
    // handle map<any, any>
    if (a instanceof Map) {
      const mapEntries: any[] = [];
      a.forEach((v, k) => {
        mapEntries.push({
          key: argParse(k),
          value: argParse(v),
        });
      });
      bufs.push(Buffer.from(JSON.stringify({
        type: 'Dictionary',
        value: mapEntries,
      }), 'utf-8'));
      // assume its string : string
    } else if (Array.isArray(a)) {
      const arrEntries: any[] = [];
      a.forEach((e) => {
        arrEntries.push(argParse(e));
      });
      bufs.push(Buffer.from(JSON.stringify({
        type: 'Array',
        value: arrEntries,
      }), 'utf-8'));
      // handle array
    } else {
      bufs.push(Buffer.from(JSON.stringify(argParse(a))));
    }
  });
  return bufs.map((x) => x.toString('base64'));
};

export const preparePayload = (tx: TxPayload) => {
  return [
    scriptBuffer(tx.script),
    tx.arguments,
    blockBuffer(tx.refBlock),
    tx.gasLimit,
    addressBuffer(<string>tx.proposalKey.address.toString('hex')),
    tx.proposalKey.key_id,
    tx.proposalKey.sequence_number,
    addressBuffer(tx.payer),
    tx.authorizers.map(addressBuffer),
  ];
};

export const prepareEnvelope = (tx: TxEnvelope) => {
  return [preparePayload(tx), preparePayloadSignatures(tx)];
};

export const preparePayloadSignatures = (tx: TxEnvelope) => {
  const sigs: any[] = [];
  tx.authorizers.forEach((auth, i) => {
    tx.payload_signatures.forEach((sig) => {
      if (sig.address == auth) {
        sigs.push([
          i,
          sig.keyId,
          signatureBuffer(sig.sig),
        ]);
      }
    });
  });
  return sigs;
};

export const TX_DOMAIN_TAG_HEX = rightPaddedHexBuffer(Buffer.from('FLOW-V0.0-transaction', 'utf-8').toString('hex'), 32).toString('hex');

export const transactionSignature = (msg: string, key: AccountKey): string => {
  const ec = new EC('p256');
  const k = ec.keyFromPrivate(<Buffer>key.private_key);
  // sha3(256)
  const sha = new SHA3(256);
  const totalMsgHex = TX_DOMAIN_TAG_HEX + msg;
  sha.update(Buffer.from(totalMsgHex, 'hex'));
  const digest = sha.digest();
  const sig = k.sign(digest);
  const n = 32;
  const r = sig.r.toArrayLike(Buffer, 'be', n);
  const s = sig.s.toArrayLike(Buffer, 'be', n);
  return Buffer.concat([r, s]).toString('hex');
};

export const genP256 = (): { privateKey: string, publicKey: string } => {
  const ec = new EC('p256');
  const k = ec.genKeyPair();
  const publicKey = Buffer.from(k.getPublic().getX().toArray('be', 32).concat(k.getPublic().getY().toArray('be', 32))).toString('hex');
  const privateKey = Buffer.from(k.getPrivate().toArray('be')).toString('hex');
  return { publicKey, privateKey };
};
