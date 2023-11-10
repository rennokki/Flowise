import { ICommonObject, INode, INodeData, INodeOutputsValue, INodeParams } from '../../../src/Interface'
import { getBaseClasses, handleEscapeCharacters } from '../../../src/utils'
import { OpenAIVisionChain } from './OpenAIVisionChain'
import { BaseLanguageModel } from 'langchain/base_language'
import { ConsoleCallbackHandler, CustomChainHandler, additionalCallbacks } from '../../../src/handler'
import { formatResponse } from '../../outputparsers/OutputParserHelpers'

class VisionChain_Chains implements INode {
    label: string
    name: string
    version: number
    type: string
    icon: string
    category: string
    baseClasses: string[]
    description: string
    inputs: INodeParams[]
    outputs: INodeOutputsValue[]

    constructor() {
        this.label = 'Vision Chain'
        this.name = 'visionChain'
        this.version = 3.0
        this.type = 'VisionChain'
        this.icon = 'chain.svg'
        this.category = 'Chains'
        this.description = 'Chain to run queries against Specialised LLMs trained for Image Identification (Vision).'
        this.baseClasses = [this.type, ...getBaseClasses(OpenAIVisionChain)]
        this.inputs = [
            {
                label: 'Language Model',
                name: 'model',
                type: 'BaseLanguageModel'
            },
            {
                label: 'Prompt',
                name: 'prompt',
                type: 'BasePromptTemplate',
                optional: true
            },
            {
                label: 'File Types',
                name: 'fileType',
                description: 'Supported file types',
                type: 'multiOptions',
                options: [
                    {
                        label: 'PNG Files',
                        name: 'png'
                    },
                    {
                        label: 'JPEG',
                        name: 'jpeg'
                    },
                    {
                        label: 'Non Animated Gif',
                        name: 'gif'
                    }
                ],
                default: [],
                optional: false
            },
            {
                label: 'Image Understanding',
                description: 'Determines how the model processes the image and generates its textual understanding',
                name: 'imageUnderstanding',
                type: 'options',
                options: [
                    {
                        label: 'Low',
                        name: 'low'
                    },
                    {
                        label: 'High',
                        name: 'high'
                    }
                ],
                default: 'low',
                optional: false
            },
            {
                label: 'Chain Name',
                name: 'chainName',
                type: 'string',
                placeholder: 'Name Your Chain',
                optional: true
            }
        ]
        this.outputs = [
            {
                label: 'Vision Chain',
                name: 'visionChain',
                baseClasses: [this.type, ...getBaseClasses(OpenAIVisionChain)]
            },
            {
                label: 'Output Prediction',
                name: 'outputPrediction',
                baseClasses: ['string', 'json']
            }
        ]
    }

    async init(nodeData: INodeData, input: string, options: ICommonObject): Promise<any> {
        const model = nodeData.inputs?.model as BaseLanguageModel
        const prompt = nodeData.inputs?.prompt
        const output = nodeData.outputs?.output as string
        const promptValues = prompt.promptValues as ICommonObject
        if (output === this.name) {
            const chain = new OpenAIVisionChain({
                openAIApiKey: (model as any).openAIApiKey,
                prompt: prompt,
                verbose: process.env.DEBUG === 'true',
                imageUrl: options.url
            })
            return chain
        } else if (output === 'outputPrediction') {
            const chain = new OpenAIVisionChain({
                openAIApiKey: (model as any).openAIApiKey,
                verbose: process.env.DEBUG === 'true',
                imageUrl: options.url
            })
            const inputVariables: string[] = prompt.inputVariables as string[] // ["product"]
            const res = await runPrediction(inputVariables, chain, input, promptValues, options, nodeData)
            // eslint-disable-next-line no-console
            console.log('\x1b[92m\x1b[1m\n*****OUTPUT PREDICTION*****\n\x1b[0m\x1b[0m')
            // eslint-disable-next-line no-console
            console.log(res)
            /**
             * Apply string transformation to convert special chars:
             * FROM: hello i am ben\n\n\thow are you?
             * TO: hello i am benFLOWISE_NEWLINEFLOWISE_NEWLINEFLOWISE_TABhow are you?
             */
            return handleEscapeCharacters(res, false)
        }
    }

    async run(nodeData: INodeData, input: string, options: ICommonObject): Promise<string | object> {
        const prompt = nodeData.inputs?.prompt
        const inputVariables: string[] = prompt.inputVariables as string[] // ["product"]
        const chain = nodeData.instance as OpenAIVisionChain
        let promptValues: ICommonObject | undefined = nodeData.inputs?.prompt.promptValues as ICommonObject
        const res = await runPrediction(inputVariables, chain, input, promptValues, options, nodeData)
        // eslint-disable-next-line no-console
        console.log('\x1b[93m\x1b[1m\n*****FINAL RESULT*****\n\x1b[0m\x1b[0m')
        // eslint-disable-next-line no-console
        console.log(res)
        return res
    }
}

const runPrediction = async (
    inputVariables: string[],
    chain: OpenAIVisionChain,
    input: string,
    promptValuesRaw: ICommonObject | undefined,
    options: ICommonObject,
    nodeData: INodeData
) => {
    const loggerHandler = new ConsoleCallbackHandler(options.logger)
    const callbacks = await additionalCallbacks(nodeData, options)

    const isStreaming = options.socketIO && options.socketIOClientId
    const socketIO = isStreaming ? options.socketIO : undefined
    const socketIOClientId = isStreaming ? options.socketIOClientId : ''

    /**
     * Apply string transformation to reverse converted special chars:
     * FROM: { "value": "hello i am benFLOWISE_NEWLINEFLOWISE_NEWLINEFLOWISE_TABhow are you?" }
     * TO: { "value": "hello i am ben\n\n\thow are you?" }
     */
    const promptValues = handleEscapeCharacters(promptValuesRaw, true)
    if (options?.url) {
        chain.imageUrl = options.url
    }
    if (promptValues && inputVariables.length > 0) {
        let seen: string[] = []

        for (const variable of inputVariables) {
            seen.push(variable)
            if (promptValues[variable]) {
                chain.inputKey = variable
                seen.pop()
            }
        }

        if (seen.length === 0) {
            // All inputVariables have fixed values specified
            const options = { ...promptValues }
            if (isStreaming) {
                const handler = new CustomChainHandler(socketIO, socketIOClientId)
                const res = await chain.call(options, [loggerHandler, handler, ...callbacks])
                return formatResponse(res?.text)
            } else {
                const res = await chain.call(options, [loggerHandler, ...callbacks])
                return formatResponse(res?.text)
            }
        } else if (seen.length === 1) {
            // If one inputVariable is not specify, use input (user's question) as value
            const lastValue = seen.pop()
            if (!lastValue) throw new Error('Please provide Prompt Values')
            chain.inputKey = lastValue as string
            const options = {
                ...promptValues,
                [lastValue]: input
            }
            if (isStreaming) {
                const handler = new CustomChainHandler(socketIO, socketIOClientId)
                const res = await chain.call(options, [loggerHandler, handler, ...callbacks])
                return formatResponse(res?.text)
            } else {
                const res = await chain.call(options, [loggerHandler, ...callbacks])
                return formatResponse(res?.text)
            }
        } else {
            throw new Error(`Please provide Prompt Values for: ${seen.join(', ')}`)
        }
    } else {
        if (isStreaming) {
            const handler = new CustomChainHandler(socketIO, socketIOClientId)
            const res = await chain.run(input, [loggerHandler, handler, ...callbacks])
            return formatResponse(res)
        } else {
            const res = await chain.run(input, [loggerHandler, ...callbacks])
            return formatResponse(res)
        }
    }
}

module.exports = { nodeClass: VisionChain_Chains }
