// action - state management
import * as actionTypes from '../actions'

export const initialState = {
    isDirty: false,
    chatflow: null,
    canvasDialogShow: false,
    componentNodes: [],
    componentCredentials: [],
    workflow: null,
    removeEdgeId: ''
}

// ==============================|| CANVAS REDUCER ||============================== //

const canvasReducer = (state = initialState, action) => {
    switch (action.type) {
        case actionTypes.SET_DIRTY:
            return {
                ...state,
                isDirty: true
            }
        case actionTypes.REMOVE_DIRTY:
            return {
                ...state,
                isDirty: false
            }
        case actionTypes.SET_CHATFLOW:
            return {
                ...state,
                chatflow: action.chatflow
            }
        case actionTypes.SET_WORKFLOW:
            return {
                ...state,
                workflow: action.workflow
            }
        case actionTypes.SHOW_CANVAS_DIALOG:
            return {
                ...state,
                canvasDialogShow: true
            }
        case actionTypes.HIDE_CANVAS_DIALOG:
            return {
                ...state,
                canvasDialogShow: false
            }
        case actionTypes.SET_COMPONENT_NODES:
            return {
                ...state,
                componentNodes: action.componentNodes
            }
        case actionTypes.SET_COMPONENT_CREDENTIALS:
            return {
                ...state,
                componentCredentials: action.componentCredentials
            }
        default:
            return state
    }
}

export default canvasReducer
