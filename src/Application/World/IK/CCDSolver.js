import * as THREE from 'three'
import config from "../../../config.js";

export default class CCDSolver
{
    constructor(bones, endEffector, target, constraints = null)
    {
        this.bones = bones
        this.endEffector = endEffector
        this.target = target
        this.constraints = constraints
        this.maxIterations = config.ccdsolver.maxIterations
        this.threshold = config.ccdsolver.threshold
    }

    solve()
    {
        let iterations = 0

        for(let i = 0; i < this.maxIterations; i++)
        {
            iterations++

            const effectorPos = new THREE.Vector3()
            this.endEffector.getWorldPosition(effectorPos)

            const targetPos = this.target()

            if(effectorPos.distanceTo(targetPos) < this.threshold)
                break

            for(let j = this.bones.length - 1; j >= 0; j--)
            {
                this.solveJoint(this.bones[j], targetPos)

                if(this.constraints && !config.ccdsolver.disableConstraints)
                    this._clampBone(this.bones[j], this.constraints[j])
            }
        }

        const finalEffectorPos = new THREE.Vector3()
        this.endEffector.getWorldPosition(finalEffectorPos)
        const finalTargetPos = this.target()
        const error = finalEffectorPos.distanceTo(finalTargetPos)

        return { iterations, error, converged: error < this.threshold }
    }

    _clampBone(bone, constraint)
    {
        if(!constraint) return
        bone.rotation.x = Math.max(constraint.x.min, Math.min(constraint.x.max, bone.rotation.x))
        bone.rotation.y = Math.max(constraint.y.min, Math.min(constraint.y.max, bone.rotation.y))
        bone.rotation.z = Math.max(constraint.z.min, Math.min(constraint.z.max, bone.rotation.z))
    }

    solveJoint(bone, targetPos)
    {
        const bonePos = new THREE.Vector3()
        const effectorPos = new THREE.Vector3()

        bone.getWorldPosition(bonePos)
        this.endEffector.getWorldPosition(effectorPos)

        const toEffector = effectorPos.clone().sub(bonePos).normalize()
        const toTarget = targetPos.clone().sub(bonePos).normalize()

        const angle = Math.acos(
            Math.min(1, Math.max(-1, toEffector.dot(toTarget)))
        )

        if(angle < 0.001) return

        const axis = toEffector.clone().cross(toTarget).normalize()

        const worldQuaternion = new THREE.Quaternion()
        bone.getWorldQuaternion(worldQuaternion)

        const localAxis = axis.clone().applyQuaternion(worldQuaternion.clone().invert())

        bone.rotateOnAxis(localAxis, angle)
    }
}
