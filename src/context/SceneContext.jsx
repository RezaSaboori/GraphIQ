import React, { createContext, useContext, useReducer, useCallback } from 'react';

// Initial state with World Coordinate System
const initialState = {
  // World Coordinate System: Fixed size canvas (1920x1080 units)
  worldBounds: {
    width: 1920,
    height: 1080
  },
  
  // View transformation (camera)
  viewTransform: {
    scale: 1.0,
    translateX: 0,
    translateY: 0,
    rotation: 0
  },
  
  // Scene objects in World Coordinates
  cards: [
    {
      id: 'card1',
      x: 200, y: 300, width: 400, height: 200,
      labels: [
        { text: 'personal history', color: 'rgba(34, 197, 94, 0.8)' },
        { text: 'risk factor', color: 'rgba(59, 130, 246, 0.8)' },
        { text: 'Unspecified', color: 'rgba(239, 68, 68, 0.8)' }
      ],
      properties: [
        { name: 'name', value: 'Problems associated with the natural environment or human-made changes to the environment' }
      ],
      tubelights: []
    },
    {
      id: 'card2',
      x: 600, y: 150, width: 400, height: 200,
      labels: [
        { text: 'personal history', color: 'rgba(34, 197, 94, 0.8)' },
        { text: 'risk factor', color: 'rgba(59, 130, 246, 0.8)' },
        { text: 'Unspecified', color: 'rgba(239, 68, 68, 0.8)' }
      ],
      properties: [
        { name: 'name', value: 'Problems associated with the natural environment or human-made changes to the environment' }
      ],
      tubelights: []
    },
    {
      id: 'card3',
      x: 500, y: 500, width: 400, height: 200,
      labels: [
        { text: 'family history', color: 'rgba(249, 115, 22, 0.8)' },
        { text: 'Unspecified', color: 'rgba(239, 68, 68, 0.8)' }
      ],
      properties: [
        { name: 'name', value: 'Family history of diseases of the blood or blood-forming organs' },
        { name: 'exclusions', value: 'Occupational exposure to risk-factors' }
      ],
      tubelights: []
    }
  ],
  
  arrows: [
    {
      id: 'arrow1',
      from: 'card2',
      to: 'card1',
      label: '_Related',
      color: '#facc15',
      width: 4,
      curveness: 0.8
    },
    {
      id: 'arrow2',
      from: 'card1',
      to: 'card3',
      label: '_Connected',
      color: '#818cf8',
      width: 4,
      curveness: 0.8
    },
    {
      id: 'arrow3',
      from: 'card2',
      to: 'card3',
      label: '_Related',
      color: '#facc15',
      width: 4,
      curveness: 0.8
    }
  ],
  
  // Interaction state
  selectedCard: null,
  isDragging: false,
  dragStart: null,
  dragOffset: null
};

// Action types
const ACTION_TYPES = {
  UPDATE_VIEW_TRANSFORM: 'UPDATE_VIEW_TRANSFORM',
  UPDATE_CARD_POSITION: 'UPDATE_CARD_POSITION',
  UPDATE_TUBELIGHTS: 'UPDATE_TUBELIGHTS',
  SELECT_CARD: 'SELECT_CARD',
  START_DRAG: 'START_DRAG',
  END_DRAG: 'END_DRAG',
  RESET_VIEWPORT: 'RESET_VIEWPORT',
  SET_DRAG_OFFSET: 'SET_DRAG_OFFSET'
};

// Reducer function
function sceneReducer(state, action) {
  switch (action.type) {
    case ACTION_TYPES.UPDATE_VIEW_TRANSFORM:
      return {
        ...state,
        viewTransform: { ...state.viewTransform, ...action.payload }
      };
      
    case ACTION_TYPES.UPDATE_CARD_POSITION:
      return {
        ...state,
        cards: state.cards.map(card =>
          card.id === action.payload.cardId
            ? { ...card, x: action.payload.x, y: action.payload.y }
            : card
        )
      };
      
    case ACTION_TYPES.UPDATE_TUBELIGHTS:
      return {
        ...state,
        cards: state.cards.map(card =>
          card.id === action.payload.cardId
            ? { ...card, tubelights: action.payload.tubelights }
            : card
        )
      };
      
    case ACTION_TYPES.SELECT_CARD:
      return {
        ...state,
        selectedCard: action.payload.cardId
      };
      
    case ACTION_TYPES.START_DRAG:
      return {
        ...state,
        isDragging: true,
        dragStart: action.payload.position
      };
      
    case ACTION_TYPES.SET_DRAG_OFFSET:
      return {
        ...state,
        dragOffset: action.payload.offset
      };
      
    case ACTION_TYPES.END_DRAG:
      return {
        ...state,
        isDragging: false,
        dragStart: null,
        dragOffset: null
      };
      
    case ACTION_TYPES.RESET_VIEWPORT:
      return {
        ...state,
        viewTransform: {
          scale: 1.0,
          translateX: 0,
          translateY: 0,
          rotation: 0
        }
      };
      
    default:
      return state;
  }
}

// Create context
const SceneContext = createContext();

// Provider component
export function SceneProvider({ children }) {
  const [state, dispatch] = useReducer(sceneReducer, initialState);
  
  // Action creators
  const updateViewTransform = useCallback((transform) => {
    dispatch({ type: ACTION_TYPES.UPDATE_VIEW_TRANSFORM, payload: transform });
  }, []);
  
  const updateCardPosition = useCallback((cardId, x, y) => {
    dispatch({ type: ACTION_TYPES.UPDATE_CARD_POSITION, payload: { cardId, x, y } });
  }, []);
  
  const updateTubelights = useCallback((cardId, tubelights) => {
    dispatch({ type: ACTION_TYPES.UPDATE_TUBELIGHTS, payload: { cardId, tubelights } });
  }, []);
  
  const selectCard = useCallback((cardId) => {
    dispatch({ type: ACTION_TYPES.SELECT_CARD, payload: { cardId } });
  }, []);
  
  const startDrag = useCallback((position) => {
    dispatch({ type: ACTION_TYPES.START_DRAG, payload: { position } });
  }, []);
  
  const setDragOffset = useCallback((offset) => {
    dispatch({ type: ACTION_TYPES.SET_DRAG_OFFSET, payload: { offset } });
  }, []);
  
  const endDrag = useCallback(() => {
    dispatch({ type: ACTION_TYPES.END_DRAG });
  }, []);
  
  const resetViewport = useCallback(() => {
    dispatch({ type: ACTION_TYPES.RESET_VIEWPORT });
  }, []);
  
  // Utility functions for coordinate conversion
  const screenToWorld = useCallback((screenX, screenY) => {
    const { scale, translateX, translateY, rotation } = state.viewTransform;
    
    // First, remove the translation
    let x = screenX - translateX;
    let y = screenY - translateY;
    
    // Then, remove the scale
    x = x / scale;
    y = y / scale;
    
    // Finally, remove the rotation (apply inverse rotation)
    if (rotation !== 0) {
      const cos = Math.cos(-rotation);
      const sin = Math.sin(-rotation);
      
      const rotatedX = x * cos - y * sin;
      const rotatedY = x * sin + y * cos;
      
      x = rotatedX;
      y = rotatedY;
    }
    
    return { x, y };
  }, [state.viewTransform]);
  
  const worldToScreen = useCallback((worldX, worldY) => {
    const { scale, translateX, translateY, rotation } = state.viewTransform;
    
    let x = worldX;
    let y = worldY;
    
    // First, apply rotation
    if (rotation !== 0) {
      const cos = Math.cos(rotation);
      const sin = Math.sin(rotation);
      
      const rotatedX = x * cos - y * sin;
      const rotatedY = x * sin + y * cos;
      
      x = rotatedX;
      y = rotatedY;
    }
    
    // Then, apply scale
    x = x * scale;
    y = y * scale;
    
    // Finally, apply translation
    const screenX = x + translateX;
    const screenY = y + translateY;
    
    return { x: screenX, y: screenY };
  }, [state.viewTransform]);
  
  const value = {
    ...state,
    actions: {
      updateViewTransform,
      updateCardPosition,
      updateTubelights,
      selectCard,
      startDrag,
      setDragOffset,
      endDrag,
      resetViewport
    },
    utils: {
      screenToWorld,
      worldToScreen
    }
  };
  
  return (
    <SceneContext.Provider value={value}>
      {children}
    </SceneContext.Provider>
  );
}

// Hook to use the scene context
export function useScene() {
  const context = useContext(SceneContext);
  if (!context) {
    throw new Error('useScene must be used within a SceneProvider');
  }
  return context;
}
