import * as THREE from 'three'
import Application from './Application.js'
import LocomotionStateMachine, { LocomotionState } from './World/Locomotion/LocomotionStateMachine.js'
import config from '../config.js'

export default class CharacterController
{
    constructor()
    {
        this.application = new Application()
        this.camera = this.application.camera
        this.time = this.application.time

        this.target = null
        this.isReady = false

        this.keys = {
            w: false, s: false,
            a: false, d: false,
            q: false, e: false,
            shift: false,
            space: false
        }
        this.mouse = {
            left: false,
            right: false
        }

        this.walkSpeed = 0
        this.runSpeed  = 0

        this.verticalVelocity = 0
        this.jumpVelocity     = 0
        this.isGrounded       = true
        this._jumpRequested   = false

        this.isAnticipating      = false
        this.anticipationElapsed = 0
        this.anticipationDuration   = 0
        this.anticipationDepthWorld = 0

        this.isLandingSquashing    = false
        this.landingSquashElapsed  = 0
        this.landingSquashDuration   = 0
        this.landingSquashDepthWorld = 0

        this._appliedSquashOffset = 0

        this.lockedForward = new THREE.Vector3(0, 0, -1)

        this.stateMachine = new LocomotionStateMachine()
        this.stateAge = 0

        this.setupInput()
        this.waitForTarget()
    }

    waitForTarget()
    {
        this.application.world.on('characterReady', (hand) =>
        {
            this.target = hand.pivot
            this.isReady = true

            this.walkSpeed = hand.modelLength * config.character.walkSpeed
            this.runSpeed  = hand.modelLength * config.character.runSpeed

            this.application.physicsWorld.configureGravity()
            const gravityMagnitude = config.character.gravity
            const jumpHeightWorld  = hand.modelLength * config.character.jumpHeight
            this.jumpVelocity = Math.sqrt(2 * gravityMagnitude * jumpHeightWorld)

            this.anticipationDuration   = config.character.jumpAnticipationDuration
            this.anticipationDepthWorld = hand.modelLength * config.character.jumpAnticipationDepth
            this.landingSquashDuration   = config.character.landingSquashDuration
            this.landingSquashDepthWorld = hand.modelLength * config.character.landingSquashDepth

            this.updateLockedForward()
        })
    }

    updateLockedForward()
    {
        const forward = new THREE.Vector3()
        this.camera.instance.getWorldDirection(forward)
        forward.y = 0
        forward.normalize()
        this.lockedForward.copy(forward)
    }

    isGuiEvent(e)
    {
        return e.target.closest && e.target.closest('.lil-gui') !== null
    }

    isGuiInputFocused()
    {
        const el = document.activeElement
        return el && el.closest && el.closest('.lil-gui') !== null
    }

    setupInput()
    {
        window.addEventListener('keydown', (e) =>
        {
            if(this.isGuiInputFocused()) return
            this.onKeyDown(e.key.toLowerCase())
        })
        window.addEventListener('keyup', (e) =>
        {
            if(this.isGuiInputFocused()) return
            this.onKeyUp(e.key.toLowerCase())
        })

        window.addEventListener('mousedown', (e) =>
        {
            if(this.isGuiEvent(e)) return
            if(e.button === 0) this.mouse.left = true
            if(e.button === 2)
            {
                this.mouse.right = true
                this.updateLockedForward()
            }
        })

        window.addEventListener('mouseup', (e) =>
        {
            if(e.button === 0) this.mouse.left = false
            if(e.button === 2) this.mouse.right = false
        })
    }

    onKeyDown(key)
    {
        if(key === 'w')     this.keys.w     = true
        if(key === 's')     this.keys.s     = true
        if(key === 'a')     this.keys.a     = true
        if(key === 'd')     this.keys.d     = true
        if(key === 'q')     this.keys.q     = true
        if(key === 'e')     this.keys.e     = true
        if(key === 'shift') this.keys.shift = true

        if(key === ' ')
        {
            if(!this.keys.space && this.isGrounded && !this.isAnticipating)
                this._jumpRequested = true

            this.keys.space = true
        }
    }

    onKeyUp(key)
    {
        if(key === 'w')     this.keys.w     = false
        if(key === 's')     this.keys.s     = false
        if(key === 'a')     this.keys.a     = false
        if(key === 'd')     this.keys.d     = false
        if(key === 'q')     this.keys.q     = false
        if(key === 'e')     this.keys.e     = false
        if(key === 'shift') this.keys.shift = false
        if(key === ' ')     this.keys.space = false
    }

    getForwardDirection()
    {
        if(this.mouse.left)
            return this.lockedForward.clone()

        const forward = new THREE.Vector3()
        this.camera.instance.getWorldDirection(forward)
        forward.y = 0
        forward.normalize()
        return forward
    }

    buildParams(moveDirection, speed)
    {
        if(this.stateMachine.stateChanged)
            this.stateAge = 0
        else
            this.stateAge += this.time.delta / 1000

        return {
            state:         this.stateMachine.current,
            previousState: this.stateMachine.previous,
            stateChanged:  this.stateMachine.stateChanged,
            stateAge:      this.stateAge,
            delta:         this.time.delta,
            velocity:      moveDirection.clone().multiplyScalar(speed),
            speed:         moveDirection.length() > 0 ? speed / this.runSpeed : 0,
            isAirborne:    this.stateMachine.isAirborne()
        }
    }

    updateVerticalMovement(moveDirection)
    {
        const dt = this.time.delta / 1000

        if(this.isGrounded)
        {
            if(this.isAnticipating)
            {
                this.anticipationElapsed += dt
                if(this.anticipationElapsed < this.anticipationDuration) return false

                this.isAnticipating   = false
                this.verticalVelocity = this.jumpVelocity
                this.isGrounded       = false
                this.stateMachine.transitionTo(LocomotionState.AIRBORNE)
                return true
            }

            if(this._jumpRequested)
            {
                this._jumpRequested      = false
                this.isAnticipating      = true
                this.anticipationElapsed = 0
            }
            return false
        }

        const previousY = this.target.position.y
        this.verticalVelocity += this.application.physicsWorld.world.gravity.y * dt
        this.target.position.y += this.verticalVelocity * dt

        const hit = this.application.physicsWorld.raycastDown(
            this.target.position.x, previousY + 0.01, this.target.position.z
        )

        if(hit === null) return false
        if(this.verticalVelocity > 0 || this.target.position.y > hit.y) return false

        this.target.position.y = hit.y
        this.verticalVelocity  = 0
        this.isGrounded        = true

        this.isLandingSquashing   = true
        this.landingSquashElapsed = 0

        const landState = moveDirection.length() > 0
            ? (this.keys.shift ? LocomotionState.RUN : LocomotionState.WALK)
            : LocomotionState.IDLE
        this.stateMachine.transitionTo(landState)
        return true
    }

    computeSquashOffset(dt)
    {
        const ease = (t) => t * t * (3 - 2 * t)

        if(this.isAnticipating)
        {
            const t = THREE.MathUtils.clamp(this.anticipationElapsed / this.anticipationDuration, 0, 1)
            return -ease(t) * this.anticipationDepthWorld
        }

        if(this.isLandingSquashing)
        {
            this.landingSquashElapsed += dt
            const t = THREE.MathUtils.clamp(this.landingSquashElapsed / this.landingSquashDuration, 0, 1)
            if(t >= 1) this.isLandingSquashing = false
            return -(1 - ease(t)) * this.landingSquashDepthWorld
        }

        return 0
    }

    update()
    {
        if(!this.isReady) return

        this.target.position.y -= this._appliedSquashOffset

        const speed   = this.keys.shift ? this.runSpeed : this.walkSpeed
        const forward = this.getForwardDirection()
        const right   = new THREE.Vector3()
        right.crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize()

        const moveDirection = new THREE.Vector3()

        if(this.keys.w) moveDirection.add(forward)
        if(this.keys.s) moveDirection.sub(forward)
        if(this.keys.q) moveDirection.sub(right)
        if(this.keys.e) moveDirection.add(right)

        if(this.mouse.right)
        {
            if(this.keys.a) moveDirection.sub(right)
            if(this.keys.d) moveDirection.add(right)
        }
        else
        {
            if(this.keys.a) this.camera.rotateAroundTarget(-this.camera.keyRotateSpeed)
            if(this.keys.d) this.camera.rotateAroundTarget(this.camera.keyRotateSpeed)
        }

        const verticalTransitioned = this.updateVerticalMovement(moveDirection)
        const canTransitionHere    = !verticalTransitioned && !this.stateMachine.isAirborne()

        if(moveDirection.length() > 0)
        {
            moveDirection.normalize()
            this.target.position.addScaledVector(moveDirection, speed)

            const angle = Math.atan2(moveDirection.x, moveDirection.z)
            this.target.rotation.y = angle

            if(canTransitionHere)
            {
                if(this.keys.shift)
                    this.stateMachine.transitionTo(LocomotionState.RUN)
                else
                    this.stateMachine.transitionTo(LocomotionState.WALK)
            }
        }
        else if(canTransitionHere)
        {
            this.stateMachine.transitionTo(LocomotionState.IDLE)
        }

        this._appliedSquashOffset = this.computeSquashOffset(this.time.delta / 1000)

        const params = this.buildParams(moveDirection, speed)
        params.squashOffset = this._appliedSquashOffset
        this.application.world.hand.footPlacementController.update(params)

        this.application.followTarget.copy(this.target.position)
    }
}