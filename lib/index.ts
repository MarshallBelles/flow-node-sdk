/* eslint-disable camelcase */
export * from './models';
export * from './encode';
export { AccountKey, argBuilder, genP256 } from './signatures';
import { Axios } from 'axios';
import { AccountResponse, BlockResponse, EventsResponse, ExecuteScriptRequest, TransactionRequest, TransactionResponse, TransactionResultResponse } from './models';

export class Flow {
  private client: Axios;
  constructor(network: string) {
    switch (network) {
      case 'localhost':
        network = 'http://127.0.0.1:8888/v1';
        break;
      case 'testnet':
        network = 'https://rest-testnet.onflow.org/v1';
        break;
      case 'mainnet':
        network = 'https://rest-mainnet.onflow.org/v1';
        break;

      default:
        break;
    }
    this.client = new Axios({ baseURL: network });
  }
  public async getLatestBlock(sealed: boolean = false): Promise<BlockResponse | null> {
    const dat = JSON.parse((await this.client.get(`blocks?height=${sealed ? 'sealed' : 'final'}`)).data);
    return dat.pop();
  }
  public async getBlockById(blockId: string): Promise<BlockResponse | null> {
    const dat = JSON.parse((await this.client.get(`blocks/${blockId}`)).data);
    return dat;
  }

  public async getTransaction(transactionId: string): Promise<TransactionResponse | null> {
    const dat = JSON.parse((await this.client.get(`transactions/${transactionId}`)).data);
    return dat;
  }

  public async getTransactionResult(transactionId: string): Promise<TransactionResultResponse | null> {
    const dat = JSON.parse((await this.client.get(`transaction_results/${transactionId}`)).data);
    return dat;
  }
  public async submitTransaction(transaction: TransactionRequest): Promise<TransactionResponse | null> {
    const dat = JSON.parse((await this.client.post('transactions', JSON.stringify(transaction))).data);
    return dat;
  }
  public async getAccount(address: string): Promise<AccountResponse | null> {
    const dat = JSON.parse((await this.client.get(`accounts/${address}?expand=keys,contracts`)).data);
    return dat;
  }
  public async executeScript(script: ExecuteScriptRequest): Promise<any | null> {
    const dat = JSON.parse((await this.client.post('scripts', JSON.stringify(script))).data);
    return JSON.parse(Buffer.from(dat, 'base64').toString('utf-8'));
  }
  public async getEventsWithinBlockHeight(type: string, startHeight: number, endHeight: number): Promise<EventsResponse[] | null> {
    const dat = JSON.parse((await this.client.get(`events?type=${type}&start_height=${startHeight}&end_height=${endHeight}`)).data);
    return dat;
  }
  public async getEvents(type: string, blockIds: Array<string>): Promise<EventsResponse | null> {
    const dat = JSON.parse((await this.client.get(`events?type=${type}&block_ids=${blockIds}`)).data);
    return dat;
  }
}
