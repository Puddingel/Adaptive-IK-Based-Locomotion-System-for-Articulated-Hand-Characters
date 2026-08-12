export const LocomotionState = {
    IDLE:     'idle',
    WALK:     'walk',
    RUN:      'run',
    TURN:     'turn',
    AIRBORNE: 'airborne'
}

const transitions = {
    [LocomotionState.IDLE]:     [LocomotionState.WALK, LocomotionState.RUN, LocomotionState.AIRBORNE],
    [LocomotionState.WALK]:     [LocomotionState.IDLE, LocomotionState.RUN, LocomotionState.AIRBORNE],
    [LocomotionState.RUN]:      [LocomotionState.IDLE, LocomotionState.WALK, LocomotionState.AIRBORNE],
    [LocomotionState.AIRBORNE]: [LocomotionState.IDLE, LocomotionState.WALK, LocomotionState.RUN]
}

export default class LocomotionStateMachine
{
    constructor()
    {
        this.current = LocomotionState.IDLE
        this.previous = null
        this.stateChanged = false
        this.listeners = {}
    }

    transitionTo(newState)
    {
        if(this.current === newState)
        {
            this.stateChanged = false
            return
        }

        const allowed = transitions[this.current]
        if(!allowed.includes(newState))
        {
            console.warn(`Invalid transition: ${this.current} → ${newState}`)
            return
        }

        this.previous = this.current
        this.current = newState
        this.stateChanged = true

        this.emit(newState)
    }

    on(state, callback)
    {
        if(!this.listeners[state]) this.listeners[state] = []
        this.listeners[state].push(callback)
    }

    emit(state)
    {
        if(this.listeners[state])
            this.listeners[state].forEach(cb => cb(this.previous))
    }

    is(state)     { return this.current === state }
    isMoving()    { return this.current === LocomotionState.WALK || this.current === LocomotionState.RUN }
    isTurning()   { return this.current === LocomotionState.TURN }
    isAirborne()  { return this.current === LocomotionState.AIRBORNE }
}