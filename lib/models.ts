/* eslint-disable no-unused-vars */
export interface BlockResponse {
    header: {
        id: string;
        parent_id: string;
        height: string;
        timestamp: string;
        parent_voter_signature: string;
    };
    payload: {
        collection_guarantees: [
            {
                collection_id: string;
                signer_ids: string[];
                signature: string;
            }
        ];
        block_seals: [
            {
                block_id: string;
                result_id: string;
                final_state: string;
                aggregated_approval_signatures: [
                    {
                        verifier_signatures: string[];
                        signer_ids: string[];
                    }
                ]
            }
        ]
    }
    execution_result: {
        id: string;
        block_id: string;
        events: EventResult[];
        chunks: [
            {
                block_id: string;
                collection_index: string;
                start_state: string;
                end_state: string;
                index: string;
                number_of_transactions: string;
                total_computation_used: string;
            }
        ];
        previous_result_id: string;
        _links: {
            _self: string;
        }
    }
}

export interface EventResult {
    type: string;
    transaction_id: string;
    transaction_index: string;
    event_index: string;
    payload: string;
}

export interface TransactionResponse {
    id: string;
    script: string;
    arguments: [
        string
    ];
    reference_block_id: string;
    gas_limit: string;
    payer: string;
    proposal_key: {
        address: string;
        key_index: string;
        sequence_number: string
    };
    authorizers: [
        string
    ];
    payload_signatures: [
        {
            address: string;
            key_index: string;
            signature: string;
        }
    ];
    envelope_signatures: [
        {
            address: string;
            key_index: string;
            signature: string;
        }
    ];
    result: {
        block_id: string;
        execution: string;
        status: string; // Pending Finalized Executed Sealed Expired
        status_code: number;
        error_message: string;
        computation_used: string;
        events: EventResult[];
        _links: {
            _self: string;
        }
    };
    _expandable: {
        result: string;
    };
    _links: {
        _self: string
    }
}

export interface TransactionRequest {
    script: string;
    arguments: string[];
    reference_block_id: string;
    gas_limit: string;
    payer: string;
    proposal_key: {
        address: string;
        key_index: string;
        sequence_number: string
    };
    authorizers: string[];
    payload_signatures: Array<{
        address: string;
        key_index: string;
        signature: string;
    }>;
    envelope_signatures: Array<{
        address: string;
        key_index: string;
        signature: string;
    }>;
}

export interface TransactionResultResponse {
    block_id: string;
    execution: string;
    status: string;
    status_code: number;
    error_message: string;
    computation_used: string;
    events: EventResult[];
    _links: {
        _self: string;
    }
}

export interface AccountResponse {
    address: string;
    balance: string;
    keys: [
        {
            index: string;
            public_key: string;
            signing_algorithm: string; // Enum: BLSBLS12381 ECDSAP256 ECDSASecp256k1
            hashing_algorithm: string; // Enum: SHA2_256 SHA2_384 SHA3_256 SHA3_384 KMAC128
            sequence_number: string;
            weight: string;
            revoked: boolean;
        }
    ];
    contracts: {
        property1: string;
        property2: string
    };
    _expandable: {
        keys: string;
        contracts: string
    };
    _links: {
        _self: string
    }
}

export interface ExecuteScriptResponse {
    value: string;
}

export interface ExecuteScriptRequest {
    script: string; // base64 encoded string
    arguments: string[]; // base64 encoded JSON-Cadence
}

export interface EventsResponse {
    block_id: string;
    block_height: string;
    block_timestamp: string;
    events: EventResult[];
    _links: {
        _self: string
    }
}
