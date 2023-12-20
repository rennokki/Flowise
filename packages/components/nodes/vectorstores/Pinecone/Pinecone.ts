import { flatten } from 'lodash'
import { Pinecone } from '@pinecone-database/pinecone'
import { PineconeLibArgs, PineconeStore } from 'langchain/vectorstores/pinecone'
import { Embeddings } from 'langchain/embeddings/base'
import { Document } from 'langchain/document'
import { ICommonObject, INode, INodeData, INodeOutputsValue, INodeParams } from '../../../src/Interface'
import { getBaseClasses, getCredentialData, getCredentialParam } from '../../../src/utils'

class Pinecone_VectorStores implements INode {
    label: string
    name: string
    version: number
    description: string
    type: string
    icon: string
    category: string
    badge: string
    baseClasses: string[]
    inputs: INodeParams[]
    credential: INodeParams
    outputs: INodeOutputsValue[]

    constructor() {
        this.label = 'Pinecone'
        this.name = 'pinecone'
        this.version = 2.0
        this.type = 'Pinecone'
        this.icon = 'pinecone.png'
        this.category = 'Vector Stores'
        this.description = `Upsert embedded data and perform search upon query using Pinecone, a leading fully managed hosted vector database`
        this.baseClasses = [this.type, 'VectorStoreRetriever', 'BaseRetriever']
        this.badge = 'NEW'
        this.credential = {
            label: 'Connect Credential',
            name: 'credential',
            type: 'credential',
            credentialNames: ['pineconeApi']
        }
        this.inputs = [
            {
                label: 'Document',
                name: 'document',
                type: 'Document',
                list: true,
                optional: true
            },
            {
                label: 'Embeddings',
                name: 'embeddings',
                type: 'Embeddings'
            },
            {
                label: 'Pinecone Index',
                name: 'pineconeIndex',
                type: 'string'
            },
            {
                label: 'Pinecone Namespace',
                name: 'pineconeNamespace',
                type: 'string',
                placeholder: 'my-first-namespace',
                additionalParams: true,
                optional: true
            },
            {
                label: 'Pinecone Metadata Filter',
                name: 'pineconeMetadataFilter',
                type: 'json',
                optional: true,
                additionalParams: true
            },
            {
                label: 'Top K',
                name: 'topK',
                description: 'Number of top results to fetch. Default to 4',
                placeholder: '4',
                type: 'number',
                additionalParams: true,
                optional: true
            },
            {
                label: 'Search Type',
                name: 'searchType',
                type: 'options',
                default: 'similarity',
                options: [
                    {
                        label: 'Similarity',
                        name: 'similarity'
                    },
                    {
                        label: 'Max Marginal Relevance',
                        name: 'mmr'
                    }
                ],
                additionalParams: true,
                optional: true
            },
            {
                label: 'Fetch K (for MMR Search)',
                name: 'fetchK',
                description: 'Number of initial documents to fetch for MMR reranking. Default to 20. Used only when the search type is MMR',
                placeholder: '20',
                type: 'number',
                additionalParams: true,
                optional: true
            },
            {
                label: 'Lambda (for MMR Search)',
                name: 'lambda',
                description:
                    'Number between 0 and 1 that determines the degree of diversity among the results, where 0 corresponds to maximum diversity and 1 to minimum diversity. Used only when the search type is MMR',
                placeholder: '0.5',
                type: 'number',
                additionalParams: true,
                optional: true
            }
        ]
        this.outputs = [
            {
                label: 'Pinecone Retriever',
                name: 'retriever',
                baseClasses: this.baseClasses
            },
            {
                label: 'Pinecone Vector Store',
                name: 'vectorStore',
                baseClasses: [this.type, ...getBaseClasses(PineconeStore)]
            }
        ]
    }

    //@ts-ignore
    vectorStoreMethods = {
        async upsert(nodeData: INodeData, options: ICommonObject): Promise<void> {
            const index = nodeData.inputs?.pineconeIndex as string
            const pineconeNamespace = nodeData.inputs?.pineconeNamespace as string
            const docs = nodeData.inputs?.document as Document[]
            const embeddings = nodeData.inputs?.embeddings as Embeddings

            const credentialData = await getCredentialData(nodeData.credential ?? '', options)
            const pineconeApiKey = getCredentialParam('pineconeApiKey', credentialData, nodeData)
            const pineconeEnv = getCredentialParam('pineconeEnv', credentialData, nodeData)

            const client = new Pinecone({
                apiKey: pineconeApiKey,
                environment: pineconeEnv
            })

            const pineconeIndex = client.Index(index)

            const flattenDocs = docs && docs.length ? flatten(docs) : []
            const finalDocs = []
            for (let i = 0; i < flattenDocs.length; i += 1) {
                if (flattenDocs[i] && flattenDocs[i].pageContent) {
                    finalDocs.push(new Document(flattenDocs[i]))
                }
            }

            const obj: PineconeLibArgs = {
                pineconeIndex
            }

            if (pineconeNamespace) obj.namespace = pineconeNamespace

            try {
                await PineconeStore.fromDocuments(finalDocs, embeddings, obj)
            } catch (e) {
                throw new Error(e)
            }
        }
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const index = nodeData.inputs?.pineconeIndex as string
        const pineconeNamespace = nodeData.inputs?.pineconeNamespace as string
        const pineconeMetadataFilter = nodeData.inputs?.pineconeMetadataFilter
        const docs = nodeData.inputs?.document as Document[]
        const embeddings = nodeData.inputs?.embeddings as Embeddings
        const output = nodeData.outputs?.output as string
        const searchType = nodeData.outputs?.searchType as string
        const topK = nodeData.inputs?.topK as string
        const k = topK ? parseFloat(topK) : 4

        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const pineconeApiKey = getCredentialParam('pineconeApiKey', credentialData, nodeData)
        const pineconeEnv = getCredentialParam('pineconeEnv', credentialData, nodeData)

        const client = new Pinecone({
            apiKey: pineconeApiKey,
            environment: pineconeEnv
        })

        const pineconeIndex = client.Index(index)

        const flattenDocs = docs && docs.length ? flatten(docs) : []
        const finalDocs = []
        for (let i = 0; i < flattenDocs.length; i += 1) {
            if (flattenDocs[i] && flattenDocs[i].pageContent) {
                finalDocs.push(new Document(flattenDocs[i]))
            }
        }

        const obj: PineconeLibArgs = {
            pineconeIndex
        }

        if (pineconeNamespace) obj.namespace = pineconeNamespace
        if (pineconeMetadataFilter) {
            const metadatafilter = typeof pineconeMetadataFilter === 'object' ? pineconeMetadataFilter : JSON.parse(pineconeMetadataFilter)
            obj.filter = metadatafilter
        }

        const vectorStore = await PineconeStore.fromExistingIndex(embeddings, obj)

        if (output === 'retriever') {
            if ('mmr' === searchType) {
                const fetchK = nodeData.inputs?.fetchK as string
                const lambda = nodeData.inputs?.lambda as string
                const f = fetchK ? parseInt(fetchK) : 20
                const l = lambda ? parseFloat(lambda) : 0.5
                const retriever = vectorStore.asRetriever({
                    searchType: 'mmr',
                    k: 5,
                    searchKwargs: {
                        fetchK: f,
                        lambda: l
                    }
                })
                return retriever
            } else {
                // "searchType" is "similarity"
                const retriever = vectorStore.asRetriever(k)
                return retriever
            }
        } else if (output === 'vectorStore') {
            ;(vectorStore as any).k = k
            return vectorStore
        }
        return vectorStore
    }
}

module.exports = { nodeClass: Pinecone_VectorStores }
