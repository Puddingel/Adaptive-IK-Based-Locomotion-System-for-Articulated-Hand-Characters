// src/Application/World/Locomotion/FootPlacementController.js
import * as THREE from 'three'

import config from '../../../config.js'
import StepAnimator from "./StepAnimator.js";

export default class FootPlacementController
{
    constructor(ikTargets, chains, physicsWorld = null)
    {
        this.physicsWorld = physicsWorld

        this.fingerOrder = ['little', 'ring', 'middle', 'index']   // Daumen ausgelassen

        this.ikTargets = ikTargets
        this.chains    = chains

        this.currentStepIndex = 0

        this.fingers = {}
        this.fingerOrder.forEach((name) =>
        {
            const chainLength = this.getChainLength(chains[name])

            this.fingers[name] = {
                name,
                chainLength,
                plantedPosition: new THREE.Vector3(),
                restPosition:    new THREE.Vector3(),
                isLifted:        false,
                stepAnimator:    new StepAnimator()
            }

            this.fingers[name].plantedPosition.copy(ikTargets[name].getPosition())
        })

        this._palmOffset = null

        this._lastHandPosition = null
        this._wasAirborne = false
        this._firstUpdate = true
    }

    getChainLength(chain)
    {
        return chain.bones.reduce((sum, bone, i) =>
        {
            if(i === 0) return sum
            const a = new THREE.Vector3()
            const b = new THREE.Vector3()
            chain.bones[i - 1].getWorldPosition(a)
            bone.getWorldPosition(b)
            return sum + a.distanceTo(b)
        }, 0)
    }

    _getBonePenetration(name, finger)
    {
        if(!this.physicsWorld) return 0

        const chain  = this.chains[name]
        const margin = finger.chainLength * 0.1
        const range  = finger.chainLength

        const checkPoints = chain.bones.map(bone =>
        {
            const p = new THREE.Vector3()
            bone.getWorldPosition(p)
            return p
        })
        const effPos = new THREE.Vector3()
        chain.effector.getWorldPosition(effPos)
        checkPoints.push(effPos)

        let maxLift = 0
        checkPoints.forEach((pt) =>
        {
            const hit = this.physicsWorld.raycastDown(pt.x, pt.y + margin, pt.z, range)
            if(hit !== null && hit.y > pt.y)
                maxLift = Math.max(maxLift, hit.y - pt.y)
        })

        return maxLift
    }

    computeRestPosition(name, handPosition, velocity, isAirborne = false)
    {
        const c      = config.footPlacement
        const finger = this.fingers[name]
        const offset = c.restOffsets[name]

        const pivot = this.ikTargets[this.fingerOrder[0]].parent
        const pivotQ = new THREE.Quaternion()
        pivot.getWorldQuaternion(pivotQ)

        const localOffset = new THREE.Vector3(
            offset.x * finger.chainLength,
            0,
            offset.z * finger.chainLength
        ).applyQuaternion(pivotQ)

        const restX = handPosition.x + localOffset.x
        const restZ = handPosition.z + localOffset.z

        let restY
        if(isAirborne)
        {
            restY = finger.plantedPosition.y
        }
        else
        {
            const mcpPos = new THREE.Vector3()
            this.chains[name].bones[0].getWorldPosition(mcpPos)
            const hit = this.physicsWorld?.raycastDown(restX, mcpPos.y, restZ) ?? null
            restY = hit ? hit.y : 0
        }

        const rest = new THREE.Vector3(restX, restY, restZ)

        if(velocity.length() > 0)
        {
            rest.addScaledVector(
                velocity.clone().normalize(),
                finger.chainLength * c.restLookAhead
            )
        }

        return rest
    }

    needsStep(name, restPosition)
    {
        const finger   = this.fingers[name]
        const c        = config.footPlacement
        const distance = finger.plantedPosition.distanceTo(restPosition)
        return distance > finger.chainLength * c.stepThreshold
    }

    getNextFinger()
    {
        return this.fingerOrder[this.currentStepIndex % this.fingerOrder.length]
    }

    advanceStepIndex()
    {
        this.currentStepIndex = (this.currentStepIndex + 1) % this.fingerOrder.length
    }

    getHandPosition()
    {
        const handPosition = new THREE.Vector3()
        this.ikTargets[this.fingerOrder[0]].parent.getWorldPosition(handPosition)
        return handPosition
    }

    updateRestPositions(handPosition, velocity, isAirborne = false)
    {
        this.fingerOrder.forEach((name) =>
        {
            this.fingers[name].restPosition = this.computeRestPosition(
                name,
                handPosition,
                velocity,
                isAirborne
            )
        })
    }

    startStep(finger, state)
    {
        finger.isLifted = true
        finger.stepAnimator.begin(
            finger.plantedPosition.clone(),
            finger.restPosition.clone(),
            finger.chainLength * config.footPlacement.stepHeight,
            config.footPlacement.stepDuration[state] ?? config.footPlacement.stepDuration.walk
        )
    }

    tryStep(state)
    {
        const anyLifted = this.fingerOrder.some(n => this.fingers[n].isLifted)

        if(!anyLifted)
        {
            const nextName   = this.getNextFinger()
            const nextFinger = this.fingers[nextName]

            if(this.needsStep(nextName, nextFinger.restPosition))
            {
                this.startStep(nextFinger, state)
                this.advanceStepIndex()
                return
            }
        }

        const maxFraction = config.footPlacement.maxPlantDistance
        if(!maxFraction) return

        let worstFinger   = null
        let worstDistance = 0

        this.fingerOrder.forEach((name) =>
        {
            const finger   = this.fingers[name]
            if(finger.isLifted) return

            const distance = finger.plantedPosition.distanceTo(finger.restPosition)
            if(distance > finger.chainLength * maxFraction && distance > worstDistance)
            {
                worstDistance = distance
                worstFinger   = finger
            }
        })

        if(worstFinger)
            this.startStep(worstFinger, state)
    }

    updateActiveSteps(delta)
    {
        if(config.ik.manualTargets) return

        this.fingerOrder.forEach((name) =>
        {
            const finger   = this.fingers[name]
            const ikTarget = this.ikTargets[name]
            const localPos = new THREE.Vector3()

            if(!finger.isLifted)
            {
                if(config.footPlacement.penetrationCorrection)
                {
                    const lift = this._getBonePenetration(name, finger)
                    if(lift > 0)
                        finger.plantedPosition.y += lift
                }

                finger.stepAnimator.toLocalSpace(finger.plantedPosition, ikTarget.parent, localPos)
                ikTarget.mesh.position.copy(localPos)
                return
            }

            finger.stepAnimator.end.copy(finger.restPosition)

            const result = finger.stepAnimator.update(delta)
            finger.stepAnimator.toLocalSpace(result.position, ikTarget.parent, localPos)
            ikTarget.mesh.position.copy(localPos)

            if(result.done)
            {
                finger.plantedPosition.copy(result.position)
                finger.isLifted = false
            }
        })
    }

    _computeTargetPivotY()
    {
        if(this._palmOffset === null) return null

        const grounded = this.fingerOrder.filter(n => !this.fingers[n].isLifted)
        if(grounded.length === 0) return null

        const c = config.footPlacement
        const avgFingerY = grounded.reduce(
            (sum, n) => sum + this.fingers[n].plantedPosition.y, 0
        ) / grounded.length

        return avgFingerY + this._palmOffset + (c.palmHeightOffset ?? 0)
    }

    updatePivotHeight()
    {
        const c     = config.footPlacement
        const pivot = this.ikTargets[this.fingerOrder[0]].parent

        if(this._palmOffset === null && this.physicsWorld)
        {
            const pivotWorld = new THREE.Vector3()
            pivot.getWorldPosition(pivotWorld)
            const hit = this.physicsWorld.raycastDown(pivotWorld.x, pivotWorld.y + 1, pivotWorld.z, 20)
            if(hit !== null)
                this._palmOffset = pivotWorld.y - hit.y
        }

        const targetY = this._computeTargetPivotY()
        if(targetY === null) return

        const diff    = targetY - pivot.position.y
        const base    = c.palmHeightSmoothing ?? 0.08
        const alpha   = Math.min(1.0, base * (1 + Math.abs(diff) * 8))
        pivot.position.y += diff * alpha
    }

    update(params)
    {
        const { velocity, state, delta, isAirborne, squashOffset = 0 } = params
        const handPosition = this.getHandPosition()

        this.updateRestPositions(handPosition, velocity, isAirborne)

        if(this._firstUpdate)
        {
            this._firstUpdate = false
            this.fingerOrder.forEach((name) =>
            {
                const finger = this.fingers[name]
                finger.plantedPosition.copy(finger.restPosition)
            })
        }

        if((isAirborne || this._wasAirborne) && this._lastHandPosition)
        {
            const handDelta = new THREE.Vector3().subVectors(handPosition, this._lastHandPosition)
            this.fingerOrder.forEach((name) =>
            {
                this.fingers[name].plantedPosition.add(handDelta)
            })
        }

        if(this._wasAirborne && !isAirborne && this.physicsWorld)
        {
            this.fingerOrder.forEach((name) =>
            {
                const pp = this.fingers[name].plantedPosition
                const hit = this.physicsWorld.raycastDown(pp.x, handPosition.y + 1, pp.z)
                if(hit) pp.y = hit.y
            })
        }

        this._wasAirborne = isAirborne
        this._lastHandPosition = handPosition.clone()

        if(!isAirborne)
        {
            this.tryStep(state)
            this.updatePivotHeight()
        }

        if(squashOffset !== 0)
        {
            const pivot = this.ikTargets[this.fingerOrder[0]].parent
            pivot.position.y += squashOffset
        }

        this.updateActiveSteps(delta)
    }
}
